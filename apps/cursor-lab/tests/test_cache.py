from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from cursor_lab.bridge.cursor_agent_bridge import BridgeRunResult
from cursor_lab.diff.cache import ResultCache
from cursor_lab.diff.fingerprint import compute_fingerprint
from cursor_lab.orchestrator import EvaluateOptions, run_evaluation
from cursor_lab.registry import load_registry


def _write_minimal_fixture_tree(home: Path) -> None:
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


def test_fingerprint_changes_when_artifact_changes(tmp_path: Path) -> None:
    home = tmp_path / "lab-home"
    _write_minimal_fixture_tree(home)
    fp1 = compute_fingerprint(home, "skill:skills/core/demo-skill")

    skill = home / "lab" / ".cursor" / "skills" / "core" / "demo-skill" / "SKILL.md"
    skill.write_text("# demo updated\n", encoding="utf-8")
    fp2 = compute_fingerprint(home, "skill:skills/core/demo-skill")

    assert fp1 != fp2
    assert len(fp1) == 64


def test_result_cache_round_trip(tmp_path: Path) -> None:
    home = tmp_path / "lab-home"
    _write_minimal_fixture_tree(home)
    cache = ResultCache(home / "cache" / "results.db")

    cache.store_verdict(
        artifact_id="skill:skills/core/demo-skill",
        fingerprint="abc123",
        score_mean=0.9,
        score_std=0.01,
        success_rate=1.0,
        process_mean=0.85,
        promoted=False,
    )
    assert cache.has_verdict("skill:skills/core/demo-skill", "abc123")
    verdict = cache.get_verdict("skill:skills/core/demo-skill", "abc123")
    assert verdict is not None
    assert verdict.score_mean == pytest.approx(0.9)


def test_second_evaluate_skips_cached_artifact(
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    home = tmp_path / "lab-home"
    _write_minimal_fixture_tree(home)
    registry = load_registry(home)

    bridge = MagicMock()
    bridge.run_once.return_value = BridgeRunResult(
        ok=True,
        raw={
            "status": "finished",
            "result": "done",
            "durationMs": 1,
            "runId": "run-1",
        },
        stderr="",
    )

    judge = MagicMock()
    judge.forward.return_value = MagicMock(
        weighted_score=0.9,
        process_adherence=0.85,
        deviations=[],
        per_capability={"refactor": (0.9, 0.9, "ok", 1.0)},
    )

    options = EvaluateOptions(artifact_id="skill:skills/core/demo-skill")
    run_evaluation(
        home,
        registry=registry,
        options=options,
        bridge=bridge,
        judge=judge,
    )
    assert bridge.run_once.call_count == 1

    capsys.readouterr()
    run_evaluation(
        home,
        registry=registry,
        options=options,
        bridge=bridge,
        judge=judge,
    )
    assert bridge.run_once.call_count == 1
    out = capsys.readouterr().out
    assert "cache hit" in out.lower()


def test_evaluate_force_bypasses_cache(tmp_path: Path) -> None:
    home = tmp_path / "lab-home"
    _write_minimal_fixture_tree(home)
    registry = load_registry(home)

    bridge = MagicMock()
    bridge.run_once.return_value = BridgeRunResult(
        ok=True,
        raw={
            "status": "finished",
            "result": "done",
            "durationMs": 1,
            "runId": "run-1",
        },
        stderr="",
    )

    judge = MagicMock()
    judge.forward.return_value = MagicMock(
        weighted_score=0.9,
        process_adherence=0.85,
        deviations=[],
        per_capability={"refactor": (0.9, 0.9, "ok", 1.0)},
    )

    options = EvaluateOptions(artifact_id="skill:skills/core/demo-skill")
    run_evaluation(home, registry=registry, options=options, bridge=bridge, judge=judge)
    run_evaluation(
        home,
        registry=registry,
        options=EvaluateOptions(artifact_id="skill:skills/core/demo-skill", force=True),
        bridge=bridge,
        judge=judge,
    )
    assert bridge.run_once.call_count == 2


def test_promote_noop_without_passing_verdicts(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    import argparse

    import cursor_lab.cli as cli_mod

    home = tmp_path / "lab-home"
    _write_minimal_fixture_tree(home)
    (home / "prod" / ".cursor").mkdir(parents=True)

    monkeypatch.setenv("CURSOR_LAB_HOME", str(home))
    code = cli_mod.cmd_promote(argparse.Namespace(apply_to_repo=False))

    assert code == 0
    out = capsys.readouterr().out
    assert "no artifacts to promote" in out.lower() or "no passing" in out.lower()
