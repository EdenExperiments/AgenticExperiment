from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest

from cursor_lab.registry import (
    RegistryError,
    assert_artifact_registered,
    assert_registry_non_empty,
    is_artifact_registered,
    load_registry,
)


def _lab_home() -> Path:
    return Path(__file__).resolve().parent.parent


def _cli_env(home: Path) -> dict[str, str]:
    import os

    env = dict(os.environ)
    env["CURSOR_LAB_HOME"] = str(home)
    env["PYTHONPATH"] = str(_lab_home())
    env.setdefault("CURSOR_API_KEY", "test-key")
    return env


def test_load_registry_lists_safe_edit_skill() -> None:
    registry = load_registry(_lab_home())
    assert is_artifact_registered(registry, "skill:skills/core/safe-edit-and-verify")


def test_assert_registry_non_empty_passes_for_repo_registry() -> None:
    registry = load_registry(_lab_home())
    assert_registry_non_empty(registry)


def test_assert_registry_non_empty_raises_when_empty(tmp_path: Path) -> None:
    registry_path = tmp_path / "lab" / "registry.yaml"
    registry_path.parent.mkdir(parents=True)
    registry_path.write_text('schema_version: "0.1"\nartifacts: []\n', encoding="utf-8")

    registry = load_registry(tmp_path)
    with pytest.raises(RegistryError, match="empty"):
        assert_registry_non_empty(registry)


def test_assert_artifact_registered_raises_when_missing(tmp_path: Path) -> None:
    registry_path = tmp_path / "lab" / "registry.yaml"
    registry_path.parent.mkdir(parents=True)
    registry_path.write_text(
        """\
schema_version: "0.1"
artifacts:
  - skill:skills/core/other-skill
""",
        encoding="utf-8",
    )
    registry = load_registry(tmp_path)
    with pytest.raises(RegistryError, match="not listed"):
        assert_artifact_registered(registry, "skill:skills/core/safe-edit-and-verify")


def test_evaluate_refuses_empty_registry(tmp_path: Path) -> None:
    home = tmp_path / "lab-home"
    (home / "lab").mkdir(parents=True)
    (home / "lab" / "registry.yaml").write_text(
        'schema_version: "0.1"\nartifacts: []\n',
        encoding="utf-8",
    )

    result = subprocess.run(
        [sys.executable, "-m", "cursor_lab", "evaluate"],
        cwd=home,
        env=_cli_env(home),
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0
    assert "empty" in (result.stderr + result.stdout).lower()


def test_evaluate_refuses_unlisted_artifact(tmp_path: Path) -> None:
    home = tmp_path / "lab-home"
    (home / "lab").mkdir(parents=True)
    (home / "lab" / "registry.yaml").write_text(
        """\
schema_version: "0.1"
artifacts:
  - skill:skills/core/other-skill
""",
        encoding="utf-8",
    )

    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "cursor_lab",
            "evaluate",
            "--artifact",
            "skill:skills/core/safe-edit-and-verify",
        ],
        cwd=home,
        env=_cli_env(home),
        capture_output=True,
        text=True,
    )
    assert result.returncode != 0
    assert "not listed" in (result.stderr + result.stdout).lower()


def test_assert_artifact_registered_passes_for_listed_skill() -> None:
    registry = load_registry(_lab_home())
    assert_artifact_registered(registry, "skill:skills/core/safe-edit-and-verify")


def test_evaluate_passes_registry_gate_for_listed_artifact(tmp_path: Path) -> None:
    home = tmp_path / "lab-home"
    (home / "lab").mkdir(parents=True)
    (home / "lab" / "registry.yaml").write_text(
        """\
schema_version: "0.1"
artifacts:
  - skill:skills/core/safe-edit-and-verify
""",
        encoding="utf-8",
    )

    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "cursor_lab",
            "evaluate",
            "--artifact",
            "skill:skills/core/safe-edit-and-verify",
        ],
        cwd=home,
        env=_cli_env(home),
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr + result.stdout
    assert "runs.jsonl" in (result.stderr + result.stdout).lower()
    assert "registry gate" in (result.stderr + result.stdout).lower()
