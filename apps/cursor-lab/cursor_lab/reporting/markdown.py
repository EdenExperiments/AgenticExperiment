"""Human-readable markdown summary for evaluation reports."""

from __future__ import annotations

from typing import Any


def render_markdown_report(report: dict[str, Any]) -> str:
    lines: list[str] = [
        "# Cursor Lab Evaluation Report",
        "",
        f"Schema: `{report.get('schema', 'unknown')}`",
        "",
        "| Artifact | Case | Score Mean | Score Std | Success | Process | Gate |",
        "| --- | --- | ---: | ---: | ---: | ---: | --- |",
    ]

    for row in report.get("artifacts", []):
        lines.append(
            "| {artifact} | {case} | {mean:.2f} | {std:.2f} | {success:.0%} | {process:.2f} | {gate} |".format(
                artifact=row.get("artifact_id", ""),
                case=row.get("case_id", ""),
                mean=float(row.get("score_mean", 0.0)),
                std=float(row.get("score_std", 0.0)),
                success=float(row.get("success_rate", 0.0)),
                process=float(row.get("process_mean", 0.0)),
                gate=str(row.get("gate", "hold")),
            )
        )

    lines.extend(["", "## Top Deviations", ""])
    any_dev = False
    for row in report.get("artifacts", []):
        deviations = row.get("top_deviations") or []
        if not deviations:
            continue
        any_dev = True
        lines.append(f"### {row.get('artifact_id')} / {row.get('case_id')}")
        for dev in deviations:
            lines.append(f"- {dev}")
        lines.append("")

    if not any_dev:
        lines.append("_None recorded._")
        lines.append("")

    return "\n".join(lines)
