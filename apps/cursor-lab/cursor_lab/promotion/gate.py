"""Promotion gate: threshold + variance evaluation."""

from __future__ import annotations

from dataclasses import dataclass

from cursor_lab.discovery import Thresholds

DEFAULT_MIN_PROCESS = 0.7


@dataclass(frozen=True)
class CaseAggregate:
    artifact_id: str
    case_id: str
    score_mean: float
    score_std: float
    success_rate: float
    process_mean: float
    per_capability: dict[str, dict[str, float]]
    top_deviations: list[str]


class GateDecision:
    """Promote/hold decision with optional failure reason."""

    __slots__ = ("outcome", "reason")

    def __init__(self, outcome: str, reason: str | None = None) -> None:
        self.outcome = outcome
        self.reason = reason

    def __eq__(self, other: object) -> bool:
        if isinstance(other, GateDecision):
            return self.outcome == other.outcome
        return False

    def __repr__(self) -> str:
        if self.reason:
            return f"GateDecision({self.outcome!r}, reason={self.reason!r})"
        return f"GateDecision({self.outcome!r})"


GateDecision.PROMOTE = GateDecision("promote")  # type: ignore[attr-defined]
GateDecision.HOLD = GateDecision("hold")  # type: ignore[attr-defined]


def evaluate_gate(
    aggregate: CaseAggregate,
    *,
    thresholds: Thresholds,
    min_process: float = DEFAULT_MIN_PROCESS,
) -> GateDecision:
    if aggregate.success_rate < 1.0:
        return GateDecision("hold", "success_rate below 1.0")
    if aggregate.score_mean < thresholds.min_score:
        return GateDecision(
            "hold",
            f"score_mean {aggregate.score_mean:.2f} below {thresholds.min_score}",
        )
    if aggregate.score_std > thresholds.max_variance:
        return GateDecision(
            "hold",
            f"score_std {aggregate.score_std:.2f} exceeds max variance {thresholds.max_variance}",
        )
    if aggregate.process_mean < min_process:
        return GateDecision(
            "hold",
            f"process_mean {aggregate.process_mean:.2f} below {min_process}",
        )
    return GateDecision.PROMOTE


def evaluate_artifact_gate(
    aggregates: list[CaseAggregate],
    *,
    thresholds: Thresholds,
    min_process: float = DEFAULT_MIN_PROCESS,
) -> GateDecision:
    if not aggregates:
        return GateDecision("hold", "no case aggregates")
    for agg in aggregates:
        decision = evaluate_gate(agg, thresholds=thresholds, min_process=min_process)
        if decision != GateDecision.PROMOTE:
            return decision
    return GateDecision.PROMOTE


def gate_label(decision: GateDecision) -> str:
    return decision.outcome
