"""Run loop: discover work units, execute bridge runs, judge, cache, write runs.jsonl."""

from __future__ import annotations

import asyncio
import json
import os
import statistics
import sys
import time
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from cursor_lab.bridge.cursor_agent_bridge import BridgeRunResult, CursorAgentBridge
from cursor_lab.diff.cache import ResultCache
from cursor_lab.diff.fingerprint import compute_fingerprint
from cursor_lab.discovery import (
    ArtifactRef,
    FixtureCase,
    FixtureManifest,
    Thresholds,
    discover_artifacts,
    discover_fixtures,
)
from cursor_lab.judge.judge import (
    ArtifactJudge,
    artifact_full_text,
    artifact_summary,
)
from cursor_lab.promotion.gate import CaseAggregate, GateDecision, evaluate_artifact_gate, gate_label
from cursor_lab.registry import Registry, is_artifact_registered
from cursor_lab.reporting.json_report import build_json_report, write_reports
from cursor_lab.sandbox import FixtureCase as SandboxFixtureCase
from cursor_lab.sandbox import build_sandbox

MAX_STARTUP_ATTEMPTS = 3
BACKOFF_BASE_S = 1.0
MAX_WORKERS = 4
MIN_WORKERS = 2


class EvaluationAborted(RuntimeError):
    """Non-retryable startup failure — abort the evaluation batch."""


@dataclass(frozen=True)
class WorkUnit:
    artifact: ArtifactRef
    case: FixtureCase
    seed_index: int
    manifest: FixtureManifest


@dataclass(frozen=True)
class EvaluateOptions:
    artifact_id: str | None = None
    force: bool = False
    timeout_s: int = 600


@dataclass(frozen=True)
class EvaluateResult:
    report_dir: Path
    runs_path: Path
    run_count: int
    cache_hits: int = 0


def discover_work_units(
    lab_home: Path,
    *,
    registry: Registry,
    artifact_id: str | None = None,
) -> list[WorkUnit]:
    """Expand fixtures into `(artifact, case, seed_index)` run units."""
    artifacts = {a.artifact_id: a for a in discover_artifacts(lab_home)}
    units: list[WorkUnit] = []

    for manifest in discover_fixtures(lab_home):
        aid = manifest.artifact_id
        if artifact_id is not None and aid != artifact_id:
            continue
        if not is_artifact_registered(registry, aid):
            continue
        artifact = artifacts.get(aid)
        if artifact is None:
            continue

        for case in manifest.cases:
            for seed_index in range(case.runs):
                units.append(
                    WorkUnit(
                        artifact=artifact,
                        case=case,
                        seed_index=seed_index,
                        manifest=manifest,
                    )
                )

    return units


def _backoff_seconds(attempt: int) -> float:
    return BACKOFF_BASE_S * (2**attempt)


def run_with_startup_retry(
    bridge: CursorAgentBridge,
    *,
    cwd: Path,
    prompt: str,
    timeout_s: int = 600,
    max_attempts: int = MAX_STARTUP_ATTEMPTS,
    sleep_fn: Callable[[float], None] = time.sleep,
) -> BridgeRunResult:
    """Call bridge.run_once; retry retryable startup_error with exponential backoff."""
    last: BridgeRunResult | None = None
    for attempt in range(max_attempts):
        last = bridge.run_once(cwd=cwd, prompt=prompt, timeout_s=timeout_s)
        if last.ok:
            return last

        kind = last.raw.get("kind")
        if kind != "startup_error":
            return last

        if not last.raw.get("isRetryable"):
            raise EvaluationAborted(last.raw.get("message") or "non-retryable startup_error")

        if attempt < max_attempts - 1:
            sleep_fn(_backoff_seconds(attempt))

    assert last is not None
    return last


def _file_diffs(before: dict[str, str], after: dict[str, str]) -> list[dict[str, str]]:
    diffs: list[dict[str, str]] = []
    for rel in sorted(set(before) | set(after)):
        b = before.get(rel, "")
        a = after.get(rel, "")
        if b != a:
            diffs.append({"path": rel, "before": b, "after": a})
    return diffs


def _bridge_status(result: BridgeRunResult) -> str:
    if result.ok:
        return str(result.raw.get("status") or "finished")
    kind = result.raw.get("kind")
    if kind == "startup_error":
        return "startup_error"
    if kind == "run_error":
        return "error"
    return "error"


def _run_record(
    unit: WorkUnit,
    *,
    bridge_result: BridgeRunResult,
    file_diffs: list[dict[str, str]],
    prompt: str,
    judge_verdict: dict[str, Any] | None = None,
) -> dict[str, Any]:
    raw = bridge_result.raw
    record: dict[str, Any] = {
        "run_id": raw.get("runId"),
        "agent_id": raw.get("agentId"),
        "artifact_id": unit.artifact.artifact_id,
        "case_id": unit.case.case_id,
        "seed_index": unit.seed_index,
        "status": _bridge_status(bridge_result),
        "result_text": raw.get("result") or raw.get("message") or "",
        "tool_events": raw.get("toolEvents") or [],
        "file_diffs": file_diffs,
        "stdout": "",
        "stderr": bridge_result.stderr,
        "duration_ms": int(raw.get("durationMs") or 0),
        "prompt": prompt,
    }
    if judge_verdict is not None:
        record["judge_verdict"] = judge_verdict
    return record


def _sandbox_case(unit: WorkUnit) -> SandboxFixtureCase:
    return SandboxFixtureCase(
        case_id=unit.case.case_id,
        seed_dir=unit.case.resolved_seed_dir(unit.manifest.fixture_root),
        include_agents_md=unit.case.include_agents_md,
    )


def _walk_after(root: Path) -> dict[str, str]:
    files: dict[str, str] = {}
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(root).as_posix()
        if rel == ".git" or rel.startswith(".git/"):
            continue
        files[rel] = path.read_text(encoding="utf-8")
    return files


def _default_thresholds(case: FixtureCase) -> Thresholds:
    if case.thresholds is not None:
        return case.thresholds
    return Thresholds(min_score=0.75, max_variance=0.10)


def _aggregate_case_runs(artifact_id: str, case_id: str, runs: list[dict[str, Any]]) -> CaseAggregate:
    weighted: list[float] = []
    process: list[float] = []
    finished = 0
    for run in runs:
        if run.get("status") == "finished":
            finished += 1
        verdict = run.get("judge_verdict") or {}
        if verdict:
            weighted.append(float(verdict.get("weighted_score", 0.0)))
            process.append(float(verdict.get("process_adherence", 0.0)))

    return CaseAggregate(
        artifact_id=artifact_id,
        case_id=case_id,
        score_mean=statistics.mean(weighted) if weighted else 0.0,
        score_std=statistics.pstdev(weighted) if len(weighted) > 1 else 0.0,
        success_rate=finished / len(runs) if runs else 0.0,
        process_mean=statistics.mean(process) if process else 0.0,
        per_capability={},
        top_deviations=[],
    )


def _execute_unit(
    lab_home: Path,
    unit: WorkUnit,
    *,
    bridge: CursorAgentBridge,
    judge: ArtifactJudge | None,
    timeout_s: int,
    sleep_fn: Callable[[float], None],
) -> dict[str, Any]:
    prompt = unit.case.input_path(unit.manifest.fixture_root).read_text(encoding="utf-8")
    sandbox_case = _sandbox_case(unit)

    with build_sandbox(lab_home, unit.artifact, sandbox_case) as sandbox:
        before = sandbox.snapshot_before()
        bridge_result = run_with_startup_retry(
            bridge,
            cwd=sandbox.path,
            prompt=prompt,
            timeout_s=timeout_s,
            sleep_fn=sleep_fn,
        )
        after_files = _walk_after(sandbox.path)
        diffs = _file_diffs(before, after_files)

    record = _run_record(
        unit,
        bridge_result=bridge_result,
        file_diffs=diffs,
        prompt=prompt,
    )

    if judge is not None and record["status"] == "finished":
        verdict = judge.forward(
            run_record=record,
            fixture=unit.case,
            artifact=unit.artifact,
            input_text=prompt,
            artifact_summary=artifact_summary(lab_home, unit.artifact),
            artifact_full_text=artifact_full_text(lab_home, unit.artifact),
        )
        judge_payload: dict[str, Any] | None = None
        to_dict = getattr(verdict, "to_dict", None)
        if callable(to_dict):
            payload = to_dict()
            if isinstance(payload, dict):
                judge_payload = payload
        if judge_payload is None:
            per_cap: dict[str, list[float | str]] = {}
            for cap, values in dict(verdict.per_capability).items():
                per_cap[cap] = list(values) if isinstance(values, (tuple, list)) else [values]
            judge_payload = {
                "weighted_score": float(verdict.weighted_score),
                "process_adherence": float(verdict.process_adherence),
                "deviations": list(verdict.deviations),
                "per_capability": per_cap,
            }
        record["judge_verdict"] = judge_payload

    return record


async def _run_units_concurrent(
    lab_home: Path,
    units: list[WorkUnit],
    *,
    bridge: CursorAgentBridge,
    judge: ArtifactJudge | None,
    timeout_s: int,
    sleep_fn: Callable[[float], None],
) -> list[dict[str, Any]]:
    worker_count = min(MAX_WORKERS, max(MIN_WORKERS, len(units)))
    semaphore = asyncio.Semaphore(worker_count)

    async def _one(unit: WorkUnit) -> dict[str, Any]:
        async with semaphore:
            return await asyncio.to_thread(
                _execute_unit,
                lab_home,
                unit,
                bridge=bridge,
                judge=judge,
                timeout_s=timeout_s,
                sleep_fn=sleep_fn,
            )

    return list(await asyncio.gather(*[_one(unit) for unit in units]))


def _artifact_thresholds(units: list[WorkUnit]) -> Thresholds:
    thresholds = [_default_thresholds(u.case) for u in units]
    return thresholds[0] if thresholds else Thresholds(min_score=0.75, max_variance=0.10)


def run_evaluation(
    lab_home: Path,
    *,
    registry: Registry,
    options: EvaluateOptions,
    bridge: CursorAgentBridge | None = None,
    judge: ArtifactJudge | None = None,
    cache: ResultCache | None = None,
    sleep_fn: Callable[[float], None] = time.sleep,
) -> EvaluateResult:
    """Execute work units with cache, judging, and bounded concurrency."""
    all_units = discover_work_units(lab_home, registry=registry, artifact_id=options.artifact_id)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    report_dir = lab_home / "reports" / ts
    report_dir.mkdir(parents=True, exist_ok=True)
    runs_path = report_dir / "runs.jsonl"

    api_key = os.environ.get("CURSOR_API_KEY", "")
    agent_bridge = bridge or CursorAgentBridge(api_key=api_key)
    result_cache = cache or ResultCache(lab_home / "cache" / "results.db")

    by_artifact: dict[str, list[WorkUnit]] = defaultdict(list)
    for unit in all_units:
        by_artifact[unit.artifact.artifact_id].append(unit)

    records: list[dict[str, Any]] = []
    cache_hits = 0
    gate_decisions: dict[str, str] = {}

    for artifact_id, units in sorted(by_artifact.items()):
        fingerprint = compute_fingerprint(lab_home, artifact_id)
        if not options.force and result_cache.has_verdict(artifact_id, fingerprint):
            print(f"cache hit: {artifact_id} (fingerprint {fingerprint[:12]}…)", file=sys.stdout)
            cache_hits += 1
            cached = result_cache.get_verdict(artifact_id, fingerprint)
            if cached is not None:
                gate_decisions[artifact_id] = "promote" if cached.promoted else "hold"
            continue

        artifact_records = asyncio.run(
            _run_units_concurrent(
                lab_home,
                units,
                bridge=agent_bridge,
                judge=judge,
                timeout_s=options.timeout_s,
                sleep_fn=sleep_fn,
            )
        )
        records.extend(artifact_records)

        for record in artifact_records:
            result_cache.store_run(
                artifact_id=record["artifact_id"],
                case_id=record["case_id"],
                seed_index=int(record["seed_index"]),
                fingerprint=fingerprint,
                record=record,
            )

        case_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for record in artifact_records:
            case_groups[str(record["case_id"])].append(record)

        aggregates = [
            _aggregate_case_runs(artifact_id, case_id, case_runs)
            for case_id, case_runs in sorted(case_groups.items())
        ]
        thresholds = _artifact_thresholds(units)
        decision = evaluate_artifact_gate(aggregates, thresholds=thresholds)
        gate_decisions[artifact_id] = gate_label(decision)

        if aggregates:
            all_weighted = [a.score_mean for a in aggregates]
            all_process = [a.process_mean for a in aggregates]
            all_std = [a.score_std for a in aggregates]
            result_cache.store_verdict(
                artifact_id=artifact_id,
                fingerprint=fingerprint,
                score_mean=statistics.mean(all_weighted),
                score_std=max(all_std) if all_std else 0.0,
                success_rate=min(a.success_rate for a in aggregates),
                process_mean=statistics.mean(all_process),
                promoted=decision == GateDecision.PROMOTE,
            )

    with runs_path.open("w", encoding="utf-8") as fh:
        for record in records:
            fh.write(json.dumps(record, ensure_ascii=False) + "\n")

    if records:
        write_reports(lab_home, report_dir=report_dir, gate_decisions=gate_decisions)

    return EvaluateResult(
        report_dir=report_dir,
        runs_path=runs_path,
        run_count=len(records),
        cache_hits=cache_hits,
    )
