from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

from cursor_lab.discovery import (
    ArtifactRef,
    FixtureCase,
    FixtureManifest,
    discover_artifacts,
    discover_fixtures,
    fixture_dir_for,
    fixtures_root,
    load_fixture_manifest,
)


def _lab_home() -> Path:
    return Path(__file__).resolve().parent.parent


def test_discover_artifacts_includes_safe_edit_skill() -> None:
    home = _lab_home()
    ids = {a.artifact_id for a in discover_artifacts(home)}
    assert "skill:skills/core/safe-edit-and-verify" in ids


def test_fixture_dir_for_uses_artifact_id() -> None:
    artifact_id = "skill:skills/core/safe-edit-and-verify"
    assert fixture_dir_for(artifact_id) == artifact_id


def test_fixtures_root_under_lab_home() -> None:
    home = _lab_home()
    assert fixtures_root(home) == home / "fixtures"


def test_load_fixture_manifest_has_three_cases() -> None:
    home = _lab_home()
    manifest_path = (
        fixtures_root(home)
        / fixture_dir_for("skill:skills/core/safe-edit-and-verify")
        / "manifest.yaml"
    )
    manifest = load_fixture_manifest(manifest_path)

    assert manifest.artifact_id == "skill:skills/core/safe-edit-and-verify"
    assert len(manifest.cases) == 3
    case_ids = {case.case_id for case in manifest.cases}
    assert case_ids == {
        "case-01-rename-symbol",
        "case-02-add-verification",
        "case-03-minimal-doc-edit",
    }


def test_fixture_cases_include_runs_and_thresholds() -> None:
    home = _lab_home()
    manifest_path = (
        fixtures_root(home)
        / fixture_dir_for("skill:skills/core/safe-edit-and-verify")
        / "manifest.yaml"
    )
    manifest = load_fixture_manifest(manifest_path)
    case = next(c for c in manifest.cases if c.case_id == "case-01-rename-symbol")

    assert case.runs == 3
    assert case.thresholds.min_score == 0.75
    assert case.thresholds.max_variance == 0.10
    assert case.capability_mix["refactor"] == 0.7


def test_fixture_case_resolves_input_and_seed_paths() -> None:
    home = _lab_home()
    fixture_root = (
        fixtures_root(home) / fixture_dir_for("skill:skills/core/safe-edit-and-verify")
    )
    manifest = load_fixture_manifest(fixture_root / "manifest.yaml")
    case = next(c for c in manifest.cases if c.case_id == "case-01-rename-symbol")

    assert case.input_path(fixture_root).is_file()
    seed = case.resolved_seed_dir(fixture_root)
    assert seed is not None
    assert seed.is_dir()
    assert (seed / "src" / "util.ts").is_file()


def test_discover_fixtures_links_to_registered_artifact(tmp_path: Path) -> None:
    home = tmp_path / "lab-home"
    artifact = ArtifactRef("skill", "skills/core/demo-skill")
    skill_dir = home / "lab" / ".cursor" / "skills" / "core" / "demo-skill"
    skill_dir.mkdir(parents=True)
    (skill_dir / "SKILL.md").write_text("# demo\n", encoding="utf-8")

    fixture_root = fixtures_root(home) / fixture_dir_for(artifact.artifact_id)
    fixture_root.mkdir(parents=True)
    (fixture_root / "inputs").mkdir()
    (fixture_root / "inputs" / "case-01.md").write_text("prompt\n", encoding="utf-8")
    (fixture_root / "manifest.yaml").write_text(
        """\
artifact_id: skill:skills/core/demo-skill
description: demo fixture
cases:
  - id: case-01
    input_file: inputs/case-01.md
    capability_mix:
      refactor: 1.0
    thresholds:
      min_score: 0.75
      max_variance: 0.10
    runs: 3
""",
        encoding="utf-8",
    )

    manifests = discover_fixtures(home)
    assert len(manifests) == 1
    assert manifests[0].artifact_id == artifact.artifact_id
    assert len(manifests[0].cases) == 1


def test_load_fixture_manifest_rejects_missing_cases(tmp_path: Path) -> None:
    manifest_path = tmp_path / "manifest.yaml"
    manifest_path.write_text(
        "artifact_id: skill:skills/core/x\ndescription: bad\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="cases"):
        load_fixture_manifest(manifest_path)


def test_load_fixture_manifest_rejects_invalid_capability_mix(tmp_path: Path) -> None:
    manifest_path = tmp_path / "manifest.yaml"
    manifest_path.write_text(
        """\
artifact_id: skill:skills/core/x
cases:
  - id: case-01
    input_file: inputs/case-01.md
    capability_mix:
      refactor: 0.5
    thresholds:
      min_score: 0.75
      max_variance: 0.10
    runs: 3
""",
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="capability_mix"):
        load_fixture_manifest(manifest_path)


def _cli_env(home: Path) -> dict[str, str]:
    import os

    env = dict(os.environ)
    env["CURSOR_LAB_HOME"] = str(home)
    env["PYTHONPATH"] = str(home)
    return env


def test_cursor_lab_list_shows_safe_edit_skill() -> None:
    home = _lab_home()
    result = subprocess.run(
        [sys.executable, "-m", "cursor_lab", "list"],
        cwd=home,
        env=_cli_env(home),
        check=True,
        capture_output=True,
        text=True,
    )
    assert "skill:skills/core/safe-edit-and-verify" in result.stdout
