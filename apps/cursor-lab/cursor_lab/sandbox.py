from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator

from cursor_lab.discovery import ArtifactRef


@dataclass(frozen=True)
class FixtureCase:
    """Minimal fixture case stub (manifest parsing is task 02)."""

    case_id: str
    seed_dir: Path | None = None
    include_agents_md: bool = False


@dataclass
class Sandbox:
    path: Path

    def snapshot_before(self) -> dict[str, str]:
        raise NotImplementedError

    def compute_diff(self) -> str:
        raise NotImplementedError


@contextmanager
def build_sandbox(
    home: Path,
    artifact: ArtifactRef,
    fixture_case: FixtureCase,
) -> Iterator[Sandbox]:
    raise NotImplementedError
    yield Sandbox(path=home)  # pragma: no cover
