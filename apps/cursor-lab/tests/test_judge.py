from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from cursor_lab.discovery import ArtifactRef, FixtureCase, FixtureManifest, Thresholds
from cursor_lab.judge.judge import (
    ArtifactJudge,
    JudgeVerdict,
    configure_judge_lm,
    executor_model_id,
    judge_model_id,
)
from cursor_lab.judge.rubric import (
    RUBRIC_DEFAULTS_VERSION,
    capability_criterion,
    resolve_capability_mix,
)


@dataclass
class _FakeRunRecord:
    result_text: str = "Renamed foo to bar."
    diff_text: str = "--- a/main.py\n+++ b/main.py\n"
    tool_summary: str = "read_file, edit_file"
    status: str = "finished"


def _fixture_manifest(tmp_path: Path) -> FixtureManifest:
    root = tmp_path / "fixtures" / "skill" / "skills" / "core" / "demo"
    root.mkdir(parents=True)
    (root / "inputs").mkdir()
    (root / "inputs" / "case-01.md").write_text("Rename foo.\n", encoding="utf-8")
    case = FixtureCase(
        case_id="case-01",
        input_file="inputs/case-01.md",
        capability_mix={"refactor": 0.7, "command_running": 0.3},
        thresholds=Thresholds(min_score=0.75, max_variance=0.10),
        runs=1,
    )
    return FixtureManifest(
        artifact_id="skill:skills/core/demo",
        description="demo",
        cases=(case,),
        fixture_root=root,
    )


def _artifact(tmp_path: Path) -> ArtifactRef:
    skill = tmp_path / "lab" / ".cursor" / "skills" / "core" / "demo"
    skill.mkdir(parents=True)
    (skill / "SKILL.md").write_text(
        "# Demo\n\n1. Plan\n2. Edit\n3. Verify\n",
        encoding="utf-8",
    )
    return ArtifactRef("skill", "skills/core/demo")


def test_judge_returns_weighted_score_and_process_adherence(tmp_path: Path) -> None:
    manifest = _fixture_manifest(tmp_path)
    case = manifest.cases[0]
    artifact = _artifact(tmp_path)
    prompt = case.input_path(manifest.fixture_root).read_text(encoding="utf-8")

    cap_out = SimpleNamespace(score=0.9, confidence=0.95, rationale="good refactor")
    proc_out = SimpleNamespace(adherence=0.85, deviations=["skipped verify step"])

    judge = ArtifactJudge()
    with (
        patch.object(judge, "cap", return_value=cap_out),
        patch.object(judge, "process", return_value=proc_out),
    ):
        verdict = judge.forward(
            run_record=_FakeRunRecord(),
            fixture=case,
            artifact=artifact,
            input_text=prompt,
            artifact_summary="Demo skill",
            artifact_full_text=(tmp_path / "lab" / ".cursor" / "skills" / "core" / "demo" / "SKILL.md").read_text(),
        )

    assert isinstance(verdict, JudgeVerdict)
    assert verdict.weighted_score == pytest.approx(0.9)
    assert verdict.process_adherence == pytest.approx(0.85)
    assert verdict.deviations == ["skipped verify step"]
    assert "refactor" in verdict.per_capability
    score, confidence, rationale, weight = verdict.per_capability["refactor"]
    assert score == pytest.approx(0.9)
    assert confidence == pytest.approx(0.95)
    assert rationale == "good refactor"
    assert weight == pytest.approx(0.7)


def test_resolve_capability_mix_uses_fixture_override() -> None:
    case = FixtureCase(
        case_id="c1",
        input_file="inputs/x.md",
        capability_mix={"doc_update": 1.0},
    )
    mix = resolve_capability_mix(case)
    assert mix == {"doc_update": 1.0}


def test_resolve_capability_mix_falls_back_to_defaults() -> None:
    case = FixtureCase(case_id="c1", input_file="inputs/x.md")
    mix = resolve_capability_mix(case)
    assert sum(mix.values()) == pytest.approx(1.0)
    assert "refactor" in mix


def test_capability_criterion_includes_defaults_version() -> None:
    text = capability_criterion("refactor")
    assert isinstance(text, str)
    assert len(text) > 10
    assert RUBRIC_DEFAULTS_VERSION


def test_executor_and_judge_model_ids_are_distinct(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CURSOR_LAB_EXECUTOR_MODEL", "composer-2")
    monkeypatch.setenv("CURSOR_LAB_JUDGE_MODEL", "gpt-4o")
    assert executor_model_id() == "composer-2"
    assert judge_model_id() == "gpt-4o"
    assert executor_model_id() != judge_model_id()


def test_configure_judge_lm_uses_low_temperature(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CURSOR_LAB_JUDGE_MODEL", "gpt-4o")
    monkeypatch.setenv("CURSOR_LAB_JUDGE_API_KEY", "test-judge-key")

    mock_lm = MagicMock()
    with patch("cursor_lab.judge.judge.dspy.LM", return_value=mock_lm) as lm_ctor:
        configure_judge_lm()

    lm_ctor.assert_called_once()
    kwargs = lm_ctor.call_args.kwargs
    assert kwargs["model"] == "gpt-4o"
    assert kwargs["api_key"] == "test-judge-key"
    assert kwargs["temperature"] <= 0.1


def test_doctor_judge_probe_skipped_when_deps_only(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    import argparse

    import cursor_lab.cli as cli_mod

    monkeypatch.setenv("CURSOR_API_KEY", "test-key")
    monkeypatch.setenv("CURSOR_LAB_JUDGE_API_KEY", "judge-key")
    monkeypatch.setenv("CURSOR_LAB_JUDGE_MODEL", "gpt-4o")

    with patch("shutil.which", return_value="/usr/bin/pnpm"):
        code = cli_mod.cmd_doctor(argparse.Namespace(deps_only=True, timeout_s=120))

    assert code == 0
    out = capsys.readouterr().out
    assert "deps-only" in out
    assert "judge consistency" not in out.lower()


def test_doctor_judge_consistency_probe_within_epsilon(
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    import argparse

    import cursor_lab.cli as cli_mod

    monkeypatch.setenv("CURSOR_API_KEY", "test-key")
    monkeypatch.setenv("CURSOR_LAB_JUDGE_API_KEY", "judge-key")
    monkeypatch.setenv("CURSOR_LAB_JUDGE_MODEL", "gpt-4o")

    bridge_result = MagicMock()
    bridge_result.ok = True
    bridge_result.stderr = ""
    bridge_result.raw = {"status": "finished", "result": "pong", "durationMs": 1}

    verdict_a = JudgeVerdict(
        weighted_score=0.8,
        process_adherence=0.9,
        deviations=[],
        per_capability={"refactor": (0.8, 0.9, "ok", 1.0)},
    )
    verdict_b = JudgeVerdict(
        weighted_score=0.81,
        process_adherence=0.91,
        deviations=[],
        per_capability={"refactor": (0.81, 0.9, "ok", 1.0)},
    )

    with (
        patch("shutil.which", return_value="/usr/bin/pnpm"),
        patch.object(cli_mod.CursorAgentBridge, "run_once", return_value=bridge_result),
        patch("cursor_lab.cli.probe_judge_consistency", return_value=(verdict_a, verdict_b)),
    ):
        code = cli_mod.cmd_doctor(argparse.Namespace(deps_only=False, timeout_s=120))

    assert code == 0
    out = capsys.readouterr().out
    assert "judge consistency" in out.lower()
