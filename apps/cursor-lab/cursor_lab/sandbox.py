from __future__ import annotations

import difflib
import json
import shutil
import subprocess
import tempfile
from contextlib import contextmanager
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator

from cursor_lab.discovery import ArtifactRef, lab_cursor_root

_AGENTS_MD_STUB = """# Cursor Lab Sandbox

Minimal repo context for artifact evaluation.
"""


@dataclass(frozen=True)
class FixtureCase:
    """Minimal fixture case stub (manifest parsing is task 02)."""

    case_id: str
    seed_dir: Path | None = None
    include_agents_md: bool = False


def _walk_files(root: Path) -> dict[str, str]:
    """Return relative path -> text for every file under root, excluding .git."""
    files: dict[str, str] = {}
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(root).as_posix()
        if rel == ".git" or rel.startswith(".git/"):
            continue
        files[rel] = path.read_text(encoding="utf-8")
    return files


def _copy_seed_tree(seed_dir: Path, sandbox_path: Path) -> None:
    for item in seed_dir.iterdir():
        dest = sandbox_path / item.name
        if item.is_dir():
            shutil.copytree(item, dest)
        else:
            shutil.copy2(item, dest)


def _materialize_cursor(lab_home: Path, sandbox_path: Path, artifact: ArtifactRef) -> None:
    lab_cursor = lab_cursor_root(lab_home)
    src = lab_cursor / artifact.artifact_path
    cursor_root = sandbox_path / ".cursor"

    if artifact.artifact_kind == "rule":
        dest = cursor_root / artifact.artifact_path
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)
        return

    if artifact.artifact_kind == "skill":
        dest = cursor_root / artifact.artifact_path
        shutil.copytree(src, dest)

        parts = artifact.artifact_path.split("/")
        if len(parts) < 3 or parts[0] != "skills":
            msg = f"unexpected skill artifact path: {artifact.artifact_path}"
            raise ValueError(msg)

        domain = parts[1]
        name = parts[2]
        index = {
            "skills": [
                {
                    "name": name,
                    "path": f".cursor/skills/{domain}/{name}/SKILL.md",
                    "domain": domain,
                }
            ]
        }
        index_path = cursor_root / "skills" / "skills.index.json"
        index_path.parent.mkdir(parents=True, exist_ok=True)
        index_path.write_text(json.dumps(index, indent=2) + "\n", encoding="utf-8")
        return

    msg = f"unsupported artifact kind: {artifact.artifact_kind}"
    raise ValueError(msg)


def _init_git_repo(sandbox_path: Path) -> None:
    subprocess.run(
        ["git", "init"],
        cwd=sandbox_path,
        check=True,
        capture_output=True,
        text=True,
    )


@dataclass
class Sandbox:
    path: Path
    _snapshot: dict[str, str] = field(default_factory=dict, repr=False)

    def snapshot_before(self) -> dict[str, str]:
        self._snapshot = _walk_files(self.path)
        return dict(self._snapshot)

    def compute_diff(self) -> str:
        before = self._snapshot
        after = _walk_files(self.path)
        parts: list[str] = []

        for rel in sorted(set(before) | set(after)):
            old_lines = before.get(rel, "").splitlines(keepends=True)
            new_lines = after.get(rel, "").splitlines(keepends=True)
            if old_lines == new_lines:
                continue
            parts.extend(
                difflib.unified_diff(
                    old_lines,
                    new_lines,
                    fromfile=f"a/{rel}",
                    tofile=f"b/{rel}",
                )
            )

        return "".join(parts)


@contextmanager
def build_sandbox(
    home: Path,
    artifact: ArtifactRef,
    fixture_case: FixtureCase,
) -> Iterator[Sandbox]:
    sandbox_path = Path(tempfile.mkdtemp(prefix="cursor-lab-", dir=home.parent))
    sandbox = Sandbox(path=sandbox_path)

    try:
        if fixture_case.seed_dir is not None:
            _copy_seed_tree(fixture_case.seed_dir, sandbox_path)

        _materialize_cursor(home, sandbox_path, artifact)

        if fixture_case.include_agents_md:
            (sandbox_path / "AGENTS.md").write_text(_AGENTS_MD_STUB, encoding="utf-8")

        _init_git_repo(sandbox_path)
        yield sandbox
    finally:
        shutil.rmtree(sandbox_path, ignore_errors=True)
