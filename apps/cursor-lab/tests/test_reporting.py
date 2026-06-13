from __future__ import annotations

import json
from pathlib import Path

import pytest

from cursor_lab.reporting.json_report import REPORT_SCHEMA, build_json_report
from cursor_lab.reporting.markdown import render_markdown_report


def _sample_runs() -> list[dict]:
    base = {
        "artifact_id": "skill:skills/core/demo",
        "case_id": "case-01",
        "status": "finished",
        "judge_verdict": {
            "weighted_score": 0.85,
            "process_adherence": 0.9,
            "deviations": ["minor skip"],
            "per_capability": {
                "refactor": [0.85, 0.9, "good", 0.7],
                "command_running": [0.85, 0.8, "ok", 0.3],
            },
        },
    }
    return [
        {**base, "seed_index": 0},
        {**base, "seed_index": 1, "judge_verdict": {**base["judge_verdict"], "weighted_score": 0.87}},
        {**base, "seed_index": 2, "judge_verdict": {**base["judge_verdict"], "weighted_score": 0.83}},
    ]


def test_build_json_report_aggregates_per_artifact_case() -> None:
    report = build_json_report(_sample_runs(), gate_decisions={"skill:skills/core/demo": "hold"})

    assert report["schema"] == REPORT_SCHEMA
    rows = report["artifacts"]
    assert len(rows) == 1
    row = rows[0]
    assert row["artifact_id"] == "skill:skills/core/demo"
    assert row["case_id"] == "case-01"
    assert row["score_mean"] == pytest.approx(0.85, abs=0.01)
    assert row["score_std"] == pytest.approx(0.02, abs=0.01)
    assert row["success_rate"] == pytest.approx(1.0)
    assert row["process_mean"] == pytest.approx(0.9)
    assert row["gate"] == "hold"
    assert "refactor" in row["per_capability"]


def test_render_markdown_includes_promote_hold_table() -> None:
    report = build_json_report(_sample_runs(), gate_decisions={"skill:skills/core/demo": "hold"})
    md = render_markdown_report(report)

    assert "# Cursor Lab Evaluation Report" in md
    assert "promote/hold" in md.lower() or "gate" in md.lower()
    assert "hold" in md
    assert "minor skip" in md or "deviations" in md.lower()


def test_write_report_files(tmp_path: Path) -> None:
    from cursor_lab.reporting.json_report import write_reports

    report_dir = tmp_path / "reports" / "20260101T000000Z"
    report_dir.mkdir(parents=True)
    runs_path = report_dir / "runs.jsonl"
    for run in _sample_runs():
        runs_path.write_text(
            (runs_path.read_text(encoding="utf-8") if runs_path.exists() else "")
            + json.dumps(run)
            + "\n",
            encoding="utf-8",
        )

    out = write_reports(tmp_path, report_dir=report_dir, gate_decisions={"skill:skills/core/demo": "hold"})

    assert out["json"].is_file()
    assert out["markdown"].is_file()
    payload = json.loads(out["json"].read_text(encoding="utf-8"))
    assert payload["schema"] == REPORT_SCHEMA
    assert out["markdown"].read_text(encoding="utf-8")


def test_cmd_report_writes_latest_files(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import argparse

    import cursor_lab.cli as cli_mod

    home = tmp_path / "lab-home"
    report_dir = home / "reports" / "20260101T120000Z"
    report_dir.mkdir(parents=True)
    runs_path = report_dir / "runs.jsonl"
    with runs_path.open("w", encoding="utf-8") as fh:
        for run in _sample_runs():
            fh.write(json.dumps(run) + "\n")

    monkeypatch.setenv("CURSOR_LAB_HOME", str(home))

    code = cli_mod.cmd_report(argparse.Namespace(timestamp=None))
    assert code == 0

    latest_json = home / "reports" / "latest.json"
    latest_md = home / "reports" / "latest.md"
    assert latest_json.is_file()
    assert latest_md.is_file()
    assert json.loads(latest_json.read_text(encoding="utf-8"))["schema"] == REPORT_SCHEMA
