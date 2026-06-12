"""DSPy judge module: per-capability scoring and process adherence."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Protocol

import dspy

from cursor_lab.discovery import ArtifactRef, FixtureCase, lab_cursor_root
from cursor_lab.judge.rubric import capability_criterion, resolve_capability_mix
from cursor_lab.judge.signatures import CapabilityScore, ProcessAdherence

JUDGE_TEMPERATURE = 0.1
JUDGE_CONSISTENCY_EPSILON = 0.05


def executor_model_id() -> str:
    return os.environ.get("CURSOR_LAB_EXECUTOR_MODEL", "composer-2")


def judge_model_id() -> str:
    return os.environ.get("CURSOR_LAB_JUDGE_MODEL", "gpt-4o")


def configure_judge_lm() -> dspy.LM:
    """Configure DSPy LM for judging (low temperature for repeatability)."""
    model = judge_model_id()
    api_key = os.environ.get("CURSOR_LAB_JUDGE_API_KEY", "")
    lm = dspy.LM(model=model, api_key=api_key, temperature=JUDGE_TEMPERATURE)
    dspy.configure(lm=lm)
    return lm


@dataclass(frozen=True)
class JudgeVerdict:
    weighted_score: float
    process_adherence: float
    deviations: list[str]
    per_capability: dict[str, tuple[float, float, str, float]]

    def to_dict(self) -> dict[str, Any]:
        return {
            "weighted_score": self.weighted_score,
            "process_adherence": self.process_adherence,
            "deviations": list(self.deviations),
            "per_capability": {
                cap: [score, confidence, rationale, weight]
                for cap, (score, confidence, rationale, weight) in self.per_capability.items()
            },
        }

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> JudgeVerdict:
        per_cap: dict[str, tuple[float, float, str, float]] = {}
        for cap, values in raw.get("per_capability", {}).items():
            score, confidence, rationale, weight = values
            per_cap[cap] = (float(score), float(confidence), str(rationale), float(weight))
        return cls(
            weighted_score=float(raw["weighted_score"]),
            process_adherence=float(raw["process_adherence"]),
            deviations=[str(d) for d in raw.get("deviations", [])],
            per_capability=per_cap,
        )


class RunRecordLike(Protocol):
    result_text: str
    diff_text: str
    tool_summary: str
    status: str


def artifact_summary(lab_home: Path, artifact: ArtifactRef) -> str:
    text = artifact_full_text(lab_home, artifact)
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    return lines[0] if lines else artifact.artifact_id


def artifact_full_text(lab_home: Path, artifact: ArtifactRef) -> str:
    path = lab_cursor_root(lab_home) / artifact.artifact_path
    if artifact.artifact_kind == "rule":
        return path.read_text(encoding="utf-8")
    skill_md = path / "SKILL.md"
    return skill_md.read_text(encoding="utf-8")


def _format_diff(file_diffs: list[dict[str, str]] | str | None) -> str:
    if isinstance(file_diffs, str):
        return file_diffs
    if not file_diffs:
        return ""
    parts: list[str] = []
    for entry in file_diffs:
        path = entry.get("path", "?")
        before = entry.get("before", "")
        after = entry.get("after", "")
        parts.append(f"--- {path}\n+++ {path}\n")
        if before != after:
            parts.append(f"before:\n{before}\nafter:\n{after}\n")
    return "\n".join(parts)


def _tool_summary(tool_events: list[Any] | str | None) -> str:
    if isinstance(tool_events, str):
        return tool_events
    if not tool_events:
        return ""
    names: list[str] = []
    for event in tool_events:
        if isinstance(event, dict):
            name = event.get("name") or event.get("tool") or event.get("type")
            if name:
                names.append(str(name))
        else:
            names.append(str(event))
    return ", ".join(names)


class ArtifactJudge(dspy.Module):
    """Aggregate weighted capability scores and process adherence for one run."""

    def __init__(self) -> None:
        super().__init__()
        self.cap = dspy.Predict(CapabilityScore)
        self.process = dspy.Predict(ProcessAdherence)

    def forward(
        self,
        *,
        run_record: RunRecordLike | dict[str, Any],
        fixture: FixtureCase,
        artifact: ArtifactRef,
        input_text: str,
        artifact_summary: str,
        artifact_full_text: str,
    ) -> JudgeVerdict:
        if isinstance(run_record, dict):
            result_text = str(run_record.get("result_text") or "")
            diff_text = _format_diff(run_record.get("file_diffs"))
            tool_summary = _tool_summary(run_record.get("tool_events"))
        else:
            result_text = run_record.result_text
            diff_text = run_record.diff_text
            tool_summary = run_record.tool_summary

        capability_mix = resolve_capability_mix(fixture)
        cap_scores: dict[str, tuple[float, float, str, float]] = {}

        for capability, weight in capability_mix.items():
            out = self.cap(
                capability=capability,
                criterion=capability_criterion(capability),
                artifact_summary=artifact_summary,
                user_input=input_text,
                agent_result_text=result_text,
                file_diff=diff_text,
                tool_event_summary=tool_summary,
            )
            cap_scores[capability] = (
                float(out.score),
                float(out.confidence),
                str(out.rationale),
                float(weight),
            )

        proc = self.process(
            artifact_full_text=artifact_full_text,
            user_input=input_text,
            agent_result_text=result_text,
            tool_event_summary=tool_summary,
        )

        weighted = sum(score * weight for score, _c, _r, weight in cap_scores.values())
        return JudgeVerdict(
            weighted_score=weighted,
            process_adherence=float(proc.adherence),
            deviations=[str(d) for d in proc.deviations],
            per_capability=cap_scores,
        )


def probe_judge_consistency(
    judge: ArtifactJudge | None = None,
    *,
    run_record: dict[str, Any] | None = None,
    fixture: FixtureCase | None = None,
    artifact: ArtifactRef | None = None,
    input_text: str = "probe input",
    artifact_summary_text: str = "probe artifact",
    artifact_full_text_value: str = "# Probe\n\n1. Step\n",
) -> tuple[JudgeVerdict, JudgeVerdict]:
    """Replay identical input twice; used by doctor for judge stability check."""
    configure_judge_lm()
    active = judge or ArtifactJudge()
    if fixture is None:
        fixture = FixtureCase(case_id="probe", input_file="inputs/probe.md", capability_mix={"refactor": 1.0})
    if artifact is None:
        artifact = ArtifactRef("skill", "skills/core/probe")
    if run_record is None:
        run_record = {
            "result_text": "probe output",
            "file_diffs": [],
            "tool_events": [],
            "status": "finished",
        }

    kwargs = {
        "run_record": run_record,
        "fixture": fixture,
        "artifact": artifact,
        "input_text": input_text,
        "artifact_summary": artifact_summary_text,
        "artifact_full_text": artifact_full_text_value,
    }
    first = active.forward(**kwargs)
    second = active.forward(**kwargs)
    return first, second


def scores_within_epsilon(a: JudgeVerdict, b: JudgeVerdict, epsilon: float = JUDGE_CONSISTENCY_EPSILON) -> bool:
    return (
        abs(a.weighted_score - b.weighted_score) <= epsilon
        and abs(a.process_adherence - b.process_adherence) <= epsilon
    )
