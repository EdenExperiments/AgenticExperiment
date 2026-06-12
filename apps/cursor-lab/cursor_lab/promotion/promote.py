"""Copy passing artifacts from lab/.cursor to prod/.cursor."""

from __future__ import annotations

import shutil
from dataclasses import dataclass
from pathlib import Path

from cursor_lab.diff.cache import ResultCache
from cursor_lab.diff.fingerprint import compute_fingerprint
from cursor_lab.discovery import discover_artifacts, lab_cursor_root
from cursor_lab.promotion.gate import GateDecision
from cursor_lab.registry import Registry, is_artifact_registered


@dataclass(frozen=True)
class PromoteResult:
    promoted: list[str]
    skipped: list[str]
    message: str


def _artifact_source(lab_home: Path, artifact_path: str) -> Path:
    return lab_cursor_root(lab_home) / artifact_path


def _artifact_dest(lab_home: Path, artifact_path: str) -> Path:
    return lab_home / "prod" / ".cursor" / artifact_path


def _repo_cursor_dest(lab_home: Path, artifact_path: str) -> Path:
    repo_root = lab_home.parent.parent
    return repo_root / ".cursor" / artifact_path


def promote_passing_artifacts(
    lab_home: Path,
    *,
    registry: Registry,
    cache: ResultCache | None = None,
    apply_to_repo: bool = False,
    gate_decisions: dict[str, GateDecision] | None = None,
) -> PromoteResult:
    """Copy artifacts with PROMOTE gate decision from lab to prod (and optionally repo root)."""
    cache = cache or ResultCache(lab_home / "cache" / "results.db")
    gate_decisions = gate_decisions or {}

    promoted: list[str] = []
    skipped: list[str] = []

    for artifact in discover_artifacts(lab_home):
        aid = artifact.artifact_id
        if not is_artifact_registered(registry, aid):
            continue

        fingerprint = compute_fingerprint(lab_home, aid)
        decision = gate_decisions.get(aid)
        cached = cache.get_verdict(aid, fingerprint)

        if decision is None:
            if cached is None:
                skipped.append(aid)
                continue
            if cached.promoted:
                skipped.append(aid)
                continue
            decision = GateDecision.PROMOTE

        if decision != GateDecision.PROMOTE:
            skipped.append(aid)
            continue

        src = _artifact_source(lab_home, artifact.artifact_path)
        dest = _artifact_dest(lab_home, artifact.artifact_path)
        dest.parent.mkdir(parents=True, exist_ok=True)
        if src.is_file():
            shutil.copy2(src, dest)
        else:
            if dest.exists():
                shutil.rmtree(dest)
            shutil.copytree(src, dest)

        if apply_to_repo:
            repo_dest = _repo_cursor_dest(lab_home, artifact.artifact_path)
            repo_dest.parent.mkdir(parents=True, exist_ok=True)
            if src.is_file():
                shutil.copy2(src, repo_dest)
                print(f"applied to repo: {repo_dest}")
            else:
                if repo_dest.exists():
                    shutil.rmtree(repo_dest)
                shutil.copytree(src, repo_dest)
                print(f"applied to repo: {repo_dest}/")

        if cached is not None:
            cache.store_verdict(
                artifact_id=aid,
                fingerprint=fingerprint,
                score_mean=cached.score_mean,
                score_std=cached.score_std,
                success_rate=cached.success_rate,
                process_mean=cached.process_mean,
                promoted=True,
            )

        promoted.append(aid)

    if not promoted:
        return PromoteResult(
            promoted=[],
            skipped=skipped,
            message="No artifacts to promote (no passing verdicts).",
        )

    return PromoteResult(
        promoted=promoted,
        skipped=skipped,
        message=f"Promoted {len(promoted)} artifact(s): {', '.join(promoted)}",
    )
