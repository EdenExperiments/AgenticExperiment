"""Run loop: discover work units, execute bridge runs, write runs.jsonl."""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from cursor_lab.bridge.cursor_agent_bridge import BridgeRunResult, CursorAgentBridge
from cursor_lab.discovery import (
    ArtifactRef,
    FixtureCase,
    FixtureManifest,
    discover_artifacts,
    discover_fixtures,
)
from cursor_lab.registry import Registry, is_artifact_registered
from cursor_lab.sandbox import FixtureCase as SandboxFixtureCase
from cursor_lab.sandbox import build_sandbox

MAX_STARTUP_ATTEMPTS = 3
BACKOFF_BASE_S = 1.0


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
) -> dict[str, Any]:
    raw = bridge_result.raw
    return {
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


def _sandbox_case(unit: WorkUnit) -> SandboxFixtureCase:
    return SandboxFixtureCase(
        case_id=unit.case.case_id,
        seed_dir=unit.case.resolved_seed_dir(unit.manifest.fixture_root),
        include_agents_md=unit.case.include_agents_md,
    )


def run_evaluation(
    lab_home: Path,
    *,
    registry: Registry,
    options: EvaluateOptions,
    bridge: CursorAgentBridge | None = None,
    sleep_fn: Callable[[float], None] = time.sleep,
) -> EvaluateResult:
    """Execute all work units and write `reports/<timestamp>/runs.jsonl`."""
    if options.force:
        pass  # cache bypass — task 06

    units = discover_work_units(lab_home, registry=registry, artifact_id=options.artifact_id)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    report_dir = lab_home / "reports" / ts
    report_dir.mkdir(parents=True, exist_ok=True)
    runs_path = report_dir / "runs.jsonl"

    api_key = os.environ.get("CURSOR_API_KEY", "")
    agent_bridge = bridge or CursorAgentBridge(api_key=api_key)

    records: list[dict[str, Any]] = []
    for unit in units:
        prompt = unit.case.input_path(unit.manifest.fixture_root).read_text(encoding="utf-8")
        sandbox_case = _sandbox_case(unit)

        with build_sandbox(lab_home, unit.artifact, sandbox_case) as sandbox:
            before = sandbox.snapshot_before()
            bridge_result = run_with_startup_retry(
                agent_bridge,
                cwd=sandbox.path,
                prompt=prompt,
                timeout_s=options.timeout_s,
                sleep_fn=sleep_fn,
            )
            after_files = _walk_after(sandbox.path)
            diffs = _file_diffs(before, after_files)

        records.append(
            _run_record(
                unit,
                bridge_result=bridge_result,
                file_diffs=diffs,
                prompt=prompt,
            )
        )

        if (
            not bridge_result.ok
            and bridge_result.raw.get("kind") == "startup_error"
            and bridge_result.raw.get("isRetryable")
        ):
            # Exhausted retries on a retryable startup error — continue to next unit.
            continue

    with runs_path.open("w", encoding="utf-8") as fh:
        for record in records:
            fh.write(json.dumps(record, ensure_ascii=False) + "\n")

    return EvaluateResult(report_dir=report_dir, runs_path=runs_path, run_count=len(records))


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
