"""Content fingerprint for artifact + fixture change detection."""

from __future__ import annotations

import hashlib
from pathlib import Path

from cursor_lab.discovery import discover_artifacts, discover_fixtures, fixtures_root, lab_cursor_root
from cursor_lab.judge.judge import executor_model_id, judge_model_id
from cursor_lab.judge.rubric import RUBRIC_DEFAULTS_VERSION


def _artifact_path(lab_home: Path, artifact_id: str) -> Path | None:
    for artifact in discover_artifacts(lab_home):
        if artifact.artifact_id == artifact_id:
            return lab_cursor_root(lab_home) / artifact.artifact_path
    return None


def _fixture_tree_paths(lab_home: Path, artifact_id: str) -> list[Path]:
    root = fixtures_root(lab_home) / artifact_id
    if not root.is_dir():
        return []
    paths: list[Path] = []
    for path in sorted(root.rglob("*")):
        if path.is_file():
            paths.append(path)
    return paths


def compute_fingerprint(lab_home: Path, artifact_id: str) -> str:
    """sha256 over artifact bytes, fixtures, rubric version, and model ids."""
    h = hashlib.sha256()

    artifact_path = _artifact_path(lab_home, artifact_id)
    if artifact_path is None:
        msg = f"unknown artifact_id: {artifact_id}"
        raise ValueError(msg)

    if artifact_path.is_file():
        h.update(artifact_path.read_bytes())
    else:
        for path in sorted(artifact_path.rglob("*")):
            if path.is_file():
                rel = path.relative_to(artifact_path).as_posix().encode("utf-8")
                h.update(rel)
                h.update(path.read_bytes())

    for path in _fixture_tree_paths(lab_home, artifact_id):
        rel = path.relative_to(fixtures_root(lab_home)).as_posix().encode("utf-8")
        h.update(rel)
        h.update(path.read_bytes())

    for manifest in discover_fixtures(lab_home):
        if manifest.artifact_id == artifact_id:
            manifest_path = manifest.fixture_root / "manifest.yaml"
            if manifest_path.is_file():
                h.update(manifest_path.read_bytes())

    h.update(RUBRIC_DEFAULTS_VERSION.encode("utf-8"))
    h.update(executor_model_id().encode("utf-8"))
    h.update(judge_model_id().encode("utf-8"))
    return h.hexdigest()
