"""Versioned JSON report aggregation from runs.jsonl."""

from __future__ import annotations

import json
import math
import statistics
from collections import defaultdict
from pathlib import Path
from typing import Any

from cursor_lab.reporting.markdown import render_markdown_report

REPORT_SCHEMA = "cursor-lab-verdict:v1"


def _group_key(run: dict[str, Any]) -> tuple[str, str]:
    return str(run["artifact_id"]), str(run["case_id"])


def _verdict(run: dict[str, Any]) -> dict[str, Any] | None:
    raw = run.get("judge_verdict")
    return raw if isinstance(raw, dict) else None


def _per_capability_stats(runs: list[dict[str, Any]]) -> dict[str, dict[str, float]]:
    by_cap: dict[str, list[float]] = defaultdict(list)
    for run in runs:
        verdict = _verdict(run)
        if not verdict:
            continue
        for cap, values in verdict.get("per_capability", {}).items():
            by_cap[cap].append(float(values[0]))

    stats: dict[str, dict[str, float]] = {}
    for cap, scores in by_cap.items():
        stats[cap] = {
            "mean": statistics.mean(scores),
            "std": statistics.pstdev(scores) if len(scores) > 1 else 0.0,
        }
    return stats


def _top_deviations(runs: list[dict[str, Any]], limit: int = 3) -> list[str]:
    seen: list[str] = []
    for run in runs:
        verdict = _verdict(run)
        if not verdict:
            continue
        for dev in verdict.get("deviations", []):
            text = str(dev).strip()
            if text and text not in seen:
                seen.append(text)
            if len(seen) >= limit:
                return seen
    return seen


def aggregate_runs(
    runs: list[dict[str, Any]],
    *,
    gate_decisions: dict[str, str] | None = None,
) -> dict[str, Any]:
    """Aggregate per (artifact_id, case_id) statistics."""
    groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for run in runs:
        groups[_group_key(run)].append(run)

    gate_decisions = gate_decisions or {}
    artifacts: list[dict[str, Any]] = []

    for (artifact_id, case_id), group in sorted(groups.items()):
        weighted_scores: list[float] = []
        process_scores: list[float] = []
        finished = 0
        for run in group:
            if run.get("status") == "finished":
                finished += 1
            verdict = _verdict(run)
            if verdict:
                weighted_scores.append(float(verdict["weighted_score"]))
                process_scores.append(float(verdict["process_adherence"]))

        score_mean = statistics.mean(weighted_scores) if weighted_scores else 0.0
        score_std = statistics.pstdev(weighted_scores) if len(weighted_scores) > 1 else 0.0
        process_mean = statistics.mean(process_scores) if process_scores else 0.0
        success_rate = finished / len(group) if group else 0.0

        artifacts.append(
            {
                "artifact_id": artifact_id,
                "case_id": case_id,
                "run_count": len(group),
                "score_mean": score_mean,
                "score_std": score_std,
                "success_rate": success_rate,
                "process_mean": process_mean,
                "per_capability": _per_capability_stats(group),
                "top_deviations": _top_deviations(group),
                "gate": gate_decisions.get(artifact_id, "hold"),
            }
        )

    return {
        "schema": REPORT_SCHEMA,
        "artifacts": artifacts,
    }


def build_json_report(
    runs: list[dict[str, Any]],
    *,
    gate_decisions: dict[str, str] | None = None,
) -> dict[str, Any]:
    return aggregate_runs(runs, gate_decisions=gate_decisions)


def load_runs_jsonl(path: Path) -> list[dict[str, Any]]:
    runs: list[dict[str, Any]] = []
    if not path.is_file():
        return runs
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        runs.append(json.loads(line))
    return runs


def find_latest_report_dir(lab_home: Path) -> Path | None:
    reports = lab_home / "reports"
    if not reports.is_dir():
        return None
    candidates = [
        p
        for p in reports.iterdir()
        if p.is_dir() and (p / "runs.jsonl").is_file() and p.name != "latest"
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda p: p.name)


def write_reports(
    lab_home: Path,
    *,
    report_dir: Path | None = None,
    gate_decisions: dict[str, str] | None = None,
    copy_timestamp_dir: bool = True,
) -> dict[str, Path]:
    """Write `reports/latest.json` and `reports/latest.md`."""
    target_dir = report_dir or find_latest_report_dir(lab_home)
    if target_dir is None:
        msg = "no evaluation report directory with runs.jsonl found"
        raise FileNotFoundError(msg)

    runs = load_runs_jsonl(target_dir / "runs.jsonl")
    report = build_json_report(runs, gate_decisions=gate_decisions)
    markdown = render_markdown_report(report)

    reports_root = lab_home / "reports"
    reports_root.mkdir(parents=True, exist_ok=True)

    latest_json = reports_root / "latest.json"
    latest_md = reports_root / "latest.md"
    latest_json.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    latest_md.write_text(markdown, encoding="utf-8")

    if copy_timestamp_dir and target_dir.name != "latest":
        ts_json = target_dir / "summary.json"
        ts_md = target_dir / "summary.md"
        ts_json.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        ts_md.write_text(markdown, encoding="utf-8")

    return {"json": latest_json, "markdown": latest_md, "report_dir": target_dir}
