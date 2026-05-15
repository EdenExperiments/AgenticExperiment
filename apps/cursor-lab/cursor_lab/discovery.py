from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ArtifactRef:
    """Canonical artifact reference (see docs/guides/cursor-lab-eval-flow-plan.md §4.1)."""

    artifact_kind: str
    artifact_path: str

    @property
    def artifact_id(self) -> str:
        return f"{self.artifact_kind}:{self.artifact_path}"


def lab_cursor_root(lab_home: Path) -> Path:
    return lab_home / "lab" / ".cursor"


def discover_artifacts(lab_home: Path) -> list[ArtifactRef]:
    """Walk `lab/.cursor` for rules and skills (hooks later)."""
    root = lab_cursor_root(lab_home)
    if not root.is_dir():
        return []

    found: list[ArtifactRef] = []

    rules = root / "rules"
    if rules.is_dir():
        for p in sorted(rules.glob("*.mdc")):
            rel = p.relative_to(root).as_posix()
            found.append(ArtifactRef("rule", rel))

    skills = root / "skills"
    if skills.is_dir():
        for skill_md in sorted(skills.glob("*/*/SKILL.md")):
            rel = skill_md.relative_to(root).parent.as_posix()
            found.append(ArtifactRef("skill", rel))

    return found
