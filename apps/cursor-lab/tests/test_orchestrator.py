from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from cursor_lab.bridge.cursor_agent_bridge import BridgeRunResult, CursorAgentBridge
from cursor_lab.orchestrator import (
    EvaluateOptions,
    EvaluationAborted,
    discover_work_units,
    run_evaluation,
    run_with_startup_retry,
)
from cursor_lab.registry import load_registry


def _lab_home() -> Path:
    return Path(__file__).resolve().parent.parent


def _write_minimal_fixture_tree(home: Path) -> None:
    """Minimal lab + fixture layout for a single-case, single-run evaluation."""
    skill_dir = home / "lab" / ".cursor" / "skills" / "core" / "demo-skill"
    skill_dir.mkdir(parents=True, exist_ok=True)
    (skill_dir / "SKILL.md").write_text("# demo\n", encoding="utf-8")

    (home / "lab" / "registry.yaml").write_text(
        """\
schema_version: "0.1"
artifacts:
  - skill:skills/core/demo-skill
""",
        encoding="utf-8",
    )

    fixture_root = home / "fixtures" / "skill:skills/core/demo-skill"
    (fixture_root / "inputs").mkdir(parents=True)
    (fixture_root / "inputs" / "case-01.md").write_text("Rename foo to bar.\n", encoding="utf-8")
    (fixture_root / "seed" / "case-01").mkdir(parents=True)
    (fixture_root / "seed" / "case-01" / "main.py").write_text("foo = 1\n", encoding="utf-8")
    (fixture_root / "manifest.yaml").write_text(
        """\
artifact_id: skill:skills/core/demo-skill
description: demo
cases:
  - id: case-01
    input_file: inputs/case-01.md
    seed_dir: seed/case-01
    runs: 1
""",
        encoding="utf-8",
    )


def test_discover_work_units_expands_runs(tmp_path: Path) -> None:
    home = tmp_path / "lab-home"
    _write_minimal_fixture_tree(home)
    registry = load_registry(home)

    units = discover_work_units(home, registry=registry)
    assert len(units) == 1
    assert units[0].case.case_id == "case-01"
    assert units[0].seed_index == 0
    assert units[0].artifact.artifact_id == "skill:skills/core/demo-skill"


def test_discover_work_units_filters_by_artifact(tmp_path: Path) -> None:
    home = tmp_path / "lab-home"
    _write_minimal_fixture_tree(home)
    registry = load_registry(home)

    units = discover_work_units(
        home,
        registry=registry,
        artifact_id="skill:skills/core/demo-skill",
    )
    assert len(units) == 1

    none_units = discover_work_units(
        home,
        registry=registry,
        artifact_id="skill:skills/core/missing",
    )
    assert none_units == []


def test_run_with_startup_retry_retries_retryable_errors() -> None:
    bridge = MagicMock(spec=CursorAgentBridge)
    bridge.run_once.side_effect = [
        BridgeRunResult(
            ok=False,
            raw={"kind": "startup_error", "isRetryable": True, "message": "transient"},
            stderr="err1",
        ),
        BridgeRunResult(
            ok=True,
            raw={"status": "finished", "result": "done", "durationMs": 10, "runId": "r1"},
            stderr="",
        ),
    ]
    sleeps: list[float] = []

    result = run_with_startup_retry(
        bridge,
        cwd=Path("/tmp"),
        prompt="hi",
        sleep_fn=sleeps.append,
    )

    assert result.ok
    assert bridge.run_once.call_count == 2
    assert sleeps == [1.0]


def test_run_with_startup_retry_raises_on_non_retryable_startup_error() -> None:
    bridge = MagicMock(spec=CursorAgentBridge)
    bridge.run_once.return_value = BridgeRunResult(
        ok=False,
        raw={"kind": "startup_error", "isRetryable": False, "message": "bad key"},
        stderr="",
    )

    with pytest.raises(EvaluationAborted, match="bad key"):
        run_with_startup_retry(bridge, cwd=Path("/tmp"), prompt="hi")


def test_run_with_startup_retry_does_not_retry_run_error() -> None:
    bridge = MagicMock(spec=CursorAgentBridge)
    bridge.run_once.return_value = BridgeRunResult(
        ok=False,
        raw={"kind": "run_error", "result": "failed", "durationMs": 5},
        stderr="",
    )

    result = run_with_startup_retry(bridge, cwd=Path("/tmp"), prompt="hi")

    assert not result.ok
    assert bridge.run_once.call_count == 1


def test_run_evaluation_writes_runs_jsonl(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    home = tmp_path / "lab-home"
    _write_minimal_fixture_tree(home)
    registry = load_registry(home)

    bridge = MagicMock(spec=CursorAgentBridge)
    bridge.run_once.return_value = BridgeRunResult(
        ok=True,
        raw={
            "status": "finished",
            "result": "Renamed foo to bar.",
            "durationMs": 42,
            "runId": "run-abc",
        },
        stderr="bridge-log",
    )

    result = run_evaluation(
        home,
        registry=registry,
        options=EvaluateOptions(artifact_id="skill:skills/core/demo-skill"),
        bridge=bridge,
    )

    assert result.run_count == 1
    assert result.runs_path.is_file()
    lines = result.runs_path.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 1

    record = json.loads(lines[0])
    assert record["artifact_id"] == "skill:skills/core/demo-skill"
    assert record["case_id"] == "case-01"
    assert record["seed_index"] == 0
    assert record["status"] == "finished"
    assert record["result_text"] == "Renamed foo to bar."
    assert record["duration_ms"] == 42
    assert record["stderr"] == "bridge-log"
    assert isinstance(record["file_diffs"], list)
    bridge.run_once.assert_called_once()


def test_cmd_evaluate_invokes_orchestrator(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import argparse

    home = tmp_path / "lab-home"
    _write_minimal_fixture_tree(home)
    monkeypatch.setenv("CURSOR_LAB_HOME", str(home))
    monkeypatch.setenv("CURSOR_API_KEY", "test-key")

    calls: list[str] = []

    def _stub_eval(lab_home, *, registry, options, bridge=None, sleep_fn=None, judge=None, cache=None):
        calls.append(options.artifact_id or "")
        report_dir = lab_home / "reports" / "test-ts"
        report_dir.mkdir(parents=True, exist_ok=True)
        runs_path = report_dir / "runs.jsonl"
        runs_path.write_text(
            json.dumps(
                {
                    "status": "finished",
                    "result_text": "ok",
                    "file_diffs": [],
                    "duration_ms": 1,
                }
            )
            + "\n",
            encoding="utf-8",
        )
        from cursor_lab.orchestrator import EvaluateResult

        return EvaluateResult(report_dir=report_dir, runs_path=runs_path, run_count=1)

    import cursor_lab.cli as cli_mod

    monkeypatch.setattr(cli_mod, "run_evaluation", _stub_eval)

    args = argparse.Namespace(artifact="skill:skills/core/demo-skill", force=False)
    code = cli_mod.cmd_evaluate(args)

    assert code == 0
    assert calls == ["skill:skills/core/demo-skill"]


def test_repo_safe_edit_fixture_has_nine_work_units() -> None:
    home = _lab_home()
    registry = load_registry(home)
    units = discover_work_units(
        home,
        registry=registry,
        artifact_id="skill:skills/core/safe-edit-and-verify",
    )
    assert len(units) == 9  # 3 cases × 3 runs
