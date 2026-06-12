from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

from cursor_lab.discovery import ArtifactRef
from cursor_lab.sandbox import FixtureCase, build_sandbox


def _write_rule(lab_home: Path, name: str, body: str = "# rule\n") -> ArtifactRef:
    rule_path = lab_home / "lab" / ".cursor" / "rules" / name
    rule_path.parent.mkdir(parents=True, exist_ok=True)
    rule_path.write_text(body, encoding="utf-8")
    return ArtifactRef("rule", f"rules/{name}")


def _write_skill(lab_home: Path, domain: str, name: str) -> ArtifactRef:
    skill_dir = lab_home / "lab" / ".cursor" / "skills" / domain / name
    skill_dir.mkdir(parents=True, exist_ok=True)
    (skill_dir / "SKILL.md").write_text(f"# {name}\n", encoding="utf-8")
    return ArtifactRef("skill", f"skills/{domain}/{name}")


def test_build_sandbox_creates_fresh_temp_dir_with_prefix(tmp_path: Path) -> None:
    home = tmp_path / "lab-home"
    home.mkdir()
    artifact = _write_rule(home, "eval-rule.mdc")
    case = FixtureCase(case_id="case-01")

    with build_sandbox(home, artifact, case) as sandbox:
        assert sandbox.path.is_dir()
        assert sandbox.path.name.startswith("cursor-lab-")
        assert str(sandbox.path).startswith(str(tmp_path))

    assert not sandbox.path.exists()


def test_build_sandbox_uses_distinct_temp_dirs_per_run(tmp_path: Path) -> None:
    home = tmp_path / "lab-home"
    home.mkdir()
    artifact = _write_rule(home, "eval-rule.mdc")
    case = FixtureCase(case_id="case-01")

    with build_sandbox(home, artifact, case) as first:
        first_path = first.path

    with build_sandbox(home, artifact, case) as second:
        second_path = second.path

    assert first_path != second_path


def test_build_sandbox_copies_seed_tree_when_present(tmp_path: Path) -> None:
    home = tmp_path / "lab-home"
    seed = tmp_path / "seed" / "case-01"
    (seed / "src").mkdir(parents=True)
    (seed / "src" / "main.py").write_text("print('seed')\n", encoding="utf-8")
    (seed / "README.md").write_text("# seed\n", encoding="utf-8")

    artifact = _write_rule(home, "eval-rule.mdc")
    case = FixtureCase(case_id="case-01", seed_dir=seed)

    with build_sandbox(home, artifact, case) as sandbox:
        assert (sandbox.path / "src" / "main.py").read_text(encoding="utf-8") == "print('seed')\n"
        assert (sandbox.path / "README.md").read_text(encoding="utf-8") == "# seed\n"


def test_build_sandbox_materializes_only_rule_under_test(tmp_path: Path) -> None:
    home = tmp_path / "lab-home"
    target = _write_rule(home, "eval-rule.mdc", body="# under test\n")
    other = _write_rule(home, "other-rule.mdc", body="# other\n")
    assert target.artifact_id != other.artifact_id

    case = FixtureCase(case_id="case-01")

    with build_sandbox(home, target, case) as sandbox:
        cursor = sandbox.path / ".cursor"
        assert (cursor / "rules" / "eval-rule.mdc").read_text(encoding="utf-8") == "# under test\n"
        assert not (cursor / "rules" / "other-rule.mdc").exists()
        assert not (cursor / "skills").exists()


def test_build_sandbox_materializes_skill_and_minimal_skills_index(tmp_path: Path) -> None:
    home = tmp_path / "lab-home"
    target = _write_skill(home, "core", "safe-edit")
    _write_skill(home, "core", "other-skill")

    case = FixtureCase(case_id="case-01")

    with build_sandbox(home, target, case) as sandbox:
        cursor = sandbox.path / ".cursor"
        skill_md = cursor / "skills" / "core" / "safe-edit" / "SKILL.md"
        assert skill_md.read_text(encoding="utf-8") == "# safe-edit\n"
        assert not (cursor / "skills" / "core" / "other-skill").exists()

        index_path = cursor / "skills" / "skills.index.json"
        assert index_path.is_file()
        index = json.loads(index_path.read_text(encoding="utf-8"))
        assert index["skills"] == [
            {
                "name": "safe-edit",
                "path": ".cursor/skills/core/safe-edit/SKILL.md",
                "domain": "core",
            }
        ]


def test_build_sandbox_does_not_copy_host_cursor_wholesale(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    home = tmp_path / "lab-home"
    artifact = _write_rule(home, "eval-rule.mdc")

    host_cursor = tmp_path / "host-repo" / ".cursor"
    (host_cursor / "rules").mkdir(parents=True)
    (host_cursor / "rules" / "host-only.mdc").write_text("# host\n", encoding="utf-8")
    (host_cursor / "skills" / "delivery" / "host-skill").mkdir(parents=True)
    (host_cursor / "skills" / "delivery" / "host-skill" / "SKILL.md").write_text(
        "# host skill\n", encoding="utf-8"
    )

    monkeypatch.chdir(tmp_path / "host-repo")
    case = FixtureCase(case_id="case-01")

    with build_sandbox(home, artifact, case) as sandbox:
        cursor = sandbox.path / ".cursor"
        assert (cursor / "rules" / "eval-rule.mdc").is_file()
        assert not (cursor / "rules" / "host-only.mdc").exists()
        assert not (cursor / "skills" / "delivery" / "host-skill" / "SKILL.md").exists()


def test_build_sandbox_writes_agents_md_stub_when_requested(tmp_path: Path) -> None:
    home = tmp_path / "lab-home"
    artifact = _write_rule(home, "eval-rule.mdc")

    with build_sandbox(home, artifact, FixtureCase(case_id="case-01")) as sandbox:
        assert not (sandbox.path / "AGENTS.md").exists()

    with build_sandbox(
        home,
        artifact,
        FixtureCase(case_id="case-02", include_agents_md=True),
    ) as sandbox:
        agents = sandbox.path / "AGENTS.md"
        assert agents.is_file()
        assert agents.read_text(encoding="utf-8").strip()


def test_build_sandbox_initializes_git_repo(tmp_path: Path) -> None:
    home = tmp_path / "lab-home"
    artifact = _write_rule(home, "eval-rule.mdc")
    case = FixtureCase(case_id="case-01")

    with build_sandbox(home, artifact, case) as sandbox:
        assert (sandbox.path / ".git").is_dir()
        result = subprocess.run(
            ["git", "rev-parse", "--is-inside-work-tree"],
            cwd=sandbox.path,
            check=True,
            capture_output=True,
            text=True,
        )
        assert result.stdout.strip() == "true"


def test_snapshot_before_excludes_git_metadata(tmp_path: Path) -> None:
    home = tmp_path / "lab-home"
    seed = tmp_path / "seed"
    seed.mkdir()
    (seed / "app.txt").write_text("before\n", encoding="utf-8")

    artifact = _write_rule(home, "eval-rule.mdc")
    case = FixtureCase(case_id="case-01", seed_dir=seed)

    with build_sandbox(home, artifact, case) as sandbox:
        snapshot = sandbox.snapshot_before()
        assert ".git" not in snapshot
        assert all(not key.startswith(".git/") for key in snapshot)
        assert snapshot["app.txt"] == "before\n"


def test_compute_diff_emits_unified_diff_for_edited_seed_files(tmp_path: Path) -> None:
    home = tmp_path / "lab-home"
    seed = tmp_path / "seed"
    seed.mkdir()
    (seed / "app.txt").write_text("before\n", encoding="utf-8")

    artifact = _write_rule(home, "eval-rule.mdc")
    case = FixtureCase(case_id="case-01", seed_dir=seed)

    with build_sandbox(home, artifact, case) as sandbox:
        sandbox.snapshot_before()
        target = sandbox.path / "app.txt"
        target.write_text("after\n", encoding="utf-8")

        diff = sandbox.compute_diff()
        assert "---" in diff
        assert "+++" in diff
        assert "-before" in diff
        assert "+after" in diff
        assert "app.txt" in diff


def test_compute_diff_is_empty_when_no_files_change(tmp_path: Path) -> None:
    home = tmp_path / "lab-home"
    seed = tmp_path / "seed"
    seed.mkdir()
    (seed / "app.txt").write_text("stable\n", encoding="utf-8")

    artifact = _write_rule(home, "eval-rule.mdc")
    case = FixtureCase(case_id="case-01", seed_dir=seed)

    with build_sandbox(home, artifact, case) as sandbox:
        sandbox.snapshot_before()
        assert sandbox.compute_diff() == ""
