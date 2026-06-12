from __future__ import annotations

import pytest

from cursor_lab.discovery import Thresholds
from cursor_lab.promotion.gate import CaseAggregate, GateDecision, evaluate_gate


def _aggregate(
    *,
    case_id: str = "case-01",
    score_mean: float = 0.85,
    score_std: float = 0.02,
    success_rate: float = 1.0,
    process_mean: float = 0.85,
) -> CaseAggregate:
    return CaseAggregate(
        artifact_id="skill:skills/core/demo",
        case_id=case_id,
        score_mean=score_mean,
        score_std=score_std,
        success_rate=success_rate,
        process_mean=process_mean,
        per_capability={},
        top_deviations=[],
    )


def test_gate_promotes_when_all_thresholds_met() -> None:
    decision = evaluate_gate(
        _aggregate(),
        thresholds=Thresholds(min_score=0.75, max_variance=0.10),
    )
    assert decision == GateDecision.PROMOTE


def test_gate_holds_on_high_variance() -> None:
    decision = evaluate_gate(
        _aggregate(score_std=0.25),
        thresholds=Thresholds(min_score=0.75, max_variance=0.10),
    )
    assert decision == GateDecision.HOLD
    assert decision.reason is not None
    assert "variance" in decision.reason.lower()


def test_gate_holds_on_low_score() -> None:
    decision = evaluate_gate(
        _aggregate(score_mean=0.5),
        thresholds=Thresholds(min_score=0.75, max_variance=0.10),
    )
    assert decision == GateDecision.HOLD


def test_gate_holds_on_failed_runs() -> None:
    decision = evaluate_gate(
        _aggregate(success_rate=0.66),
        thresholds=Thresholds(min_score=0.75, max_variance=0.10),
    )
    assert decision == GateDecision.HOLD


def test_gate_holds_on_low_process_adherence() -> None:
    decision = evaluate_gate(
        _aggregate(process_mean=0.5),
        thresholds=Thresholds(min_score=0.75, max_variance=0.10),
    )
    assert decision == GateDecision.HOLD


def test_artifact_gate_worst_case_holds() -> None:
    from cursor_lab.promotion.gate import evaluate_artifact_gate

    aggregates = [
        _aggregate(score_mean=0.9, score_std=0.01),
        _aggregate(case_id="case-02", score_std=0.2),
    ]
    decision = evaluate_artifact_gate(
        aggregates,
        thresholds=Thresholds(min_score=0.75, max_variance=0.10),
    )
    assert decision == GateDecision.HOLD
