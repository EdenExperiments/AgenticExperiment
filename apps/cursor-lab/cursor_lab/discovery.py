from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml

_MIN_CAPABILITY_SUM = 0.99
_MAX_CAPABILITY_SUM = 1.01


@dataclass(frozen=True)
class Thresholds:
    min_score: float
    max_variance: float


@dataclass(frozen=True)
class FixtureCase:
    case_id: str
    seed_dir: Path | None = None
    input_file: str | None = None
    seed_dir_rel: str | None = None
    capability_mix: dict[str, float] | None = None
    thresholds: Thresholds | None = None
    runs: int = 3
    include_agents_md: bool = False

    def input_path(self, fixture_root: Path) -> Path:
        if self.input_file is None:
            msg = f"case {self.case_id!r} has no input_file"
            raise ValueError(msg)
        return fixture_root / self.input_file

    def resolved_seed_dir(self, fixture_root: Path) -> Path | None:
        if self.seed_dir is not None:
            return self.seed_dir
        if self.seed_dir_rel is None:
            return None
        return fixture_root / self.seed_dir_rel


@dataclass(frozen=True)
class FixtureManifest:
    artifact_id: str
    description: str
    cases: tuple[FixtureCase, ...]
    fixture_root: Path


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


def fixtures_root(lab_home: Path) -> Path:
    return lab_home / "fixtures"


def fixture_dir_for(artifact_id: str) -> str:
    """Map logical artifact_id to a cross-platform fixtures subdirectory.

    Artifact ids use ``kind:path`` (e.g. ``skill:skills/core/foo``). Colons are
    invalid on Windows paths, so fixture trees live under ``kind/path`` instead.
    """
    if ":" not in artifact_id:
        msg = f"invalid artifact_id (missing kind:path separator): {artifact_id}"
        raise ValueError(msg)
    kind, rel_path = artifact_id.split(":", 1)
    return f"{kind}/{rel_path}"


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


def _parse_thresholds(raw: object, *, context: str) -> Thresholds:
    if not isinstance(raw, dict):
        msg = f"{context}: thresholds must be a mapping"
        raise ValueError(msg)
    if "min_score" not in raw or "max_variance" not in raw:
        msg = f"{context}: thresholds require min_score and max_variance"
        raise ValueError(msg)
    return Thresholds(min_score=float(raw["min_score"]), max_variance=float(raw["max_variance"]))


def _parse_capability_mix(raw: object, *, context: str) -> dict[str, float]:
    if not isinstance(raw, dict) or not raw:
        msg = f"{context}: capability_mix must be a non-empty mapping"
        raise ValueError(msg)
    mix = {str(k): float(v) for k, v in raw.items()}
    total = sum(mix.values())
    if not (_MIN_CAPABILITY_SUM <= total <= _MAX_CAPABILITY_SUM):
        msg = f"{context}: capability_mix weights must sum to 1.0 (got {total})"
        raise ValueError(msg)
    return mix


def _parse_case(raw: object, *, context: str) -> FixtureCase:
    if not isinstance(raw, dict):
        msg = f"{context}: case must be a mapping"
        raise ValueError(msg)
    if "id" not in raw or "input_file" not in raw:
        msg = f"{context}: case requires id and input_file"
        raise ValueError(msg)

    case_id = str(raw["id"])
    case_ctx = f"{context} case {case_id!r}"

    capability_mix = None
    if "capability_mix" in raw and raw["capability_mix"] is not None:
        capability_mix = _parse_capability_mix(raw["capability_mix"], context=case_ctx)

    thresholds = None
    if "thresholds" in raw and raw["thresholds"] is not None:
        thresholds = _parse_thresholds(raw["thresholds"], context=case_ctx)

    seed_dir_rel = raw.get("seed_dir")
    if seed_dir_rel is not None:
        seed_dir_rel = str(seed_dir_rel)

    return FixtureCase(
        case_id=case_id,
        input_file=str(raw["input_file"]),
        seed_dir_rel=seed_dir_rel,
        capability_mix=capability_mix,
        thresholds=thresholds,
        runs=int(raw.get("runs", 3)),
        include_agents_md=bool(raw.get("include_agents_md", False)),
    )


def load_fixture_manifest(manifest_path: Path) -> FixtureManifest:
    raw = yaml.safe_load(manifest_path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        msg = f"invalid manifest format in {manifest_path}"
        raise ValueError(msg)

    if "artifact_id" not in raw:
        msg = f"{manifest_path}: artifact_id is required"
        raise ValueError(msg)

    cases_raw = raw.get("cases")
    if not isinstance(cases_raw, list) or not cases_raw:
        msg = f"{manifest_path}: cases must be a non-empty list"
        raise ValueError(msg)

    cases = tuple(_parse_case(entry, context=str(manifest_path)) for entry in cases_raw)
    return FixtureManifest(
        artifact_id=str(raw["artifact_id"]),
        description=str(raw.get("description", "")),
        cases=cases,
        fixture_root=manifest_path.parent,
    )


def discover_fixtures(lab_home: Path) -> list[FixtureManifest]:
    """Load fixture manifests linked to artifacts discovered under lab/.cursor."""
    artifact_ids = {a.artifact_id for a in discover_artifacts(lab_home)}
    root = fixtures_root(lab_home)
    if not root.is_dir():
        return []

    manifests: list[FixtureManifest] = []
    for manifest_path in sorted(root.rglob("manifest.yaml")):
        manifest = load_fixture_manifest(manifest_path)
        if manifest.artifact_id in artifact_ids:
            manifests.append(manifest)
    return manifests
