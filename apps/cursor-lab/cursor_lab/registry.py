from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml


class RegistryError(RuntimeError):
    """Registry validation failure."""


@dataclass(frozen=True)
class Registry:
    schema_version: str
    artifact_ids: frozenset[str]


def registry_path(lab_home: Path) -> Path:
    return lab_home / "lab" / "registry.yaml"


def load_registry(lab_home: Path) -> Registry:
    path = registry_path(lab_home)
    if not path.is_file():
        return Registry(schema_version="0.1", artifact_ids=frozenset())

    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        msg = f"invalid registry format in {path}"
        raise RegistryError(msg)

    schema_version = str(raw.get("schema_version", "0.1"))
    entries = raw.get("artifacts", [])
    if entries is None:
        entries = []
    if not isinstance(entries, list):
        msg = f"registry artifacts must be a list in {path}"
        raise RegistryError(msg)

    ids: set[str] = set()
    for entry in entries:
        if isinstance(entry, str):
            ids.add(entry)
            continue
        if isinstance(entry, dict) and "id" in entry:
            ids.add(str(entry["id"]))
            continue
        msg = f"invalid registry entry {entry!r} in {path}"
        raise RegistryError(msg)

    return Registry(schema_version=schema_version, artifact_ids=frozenset(ids))


def is_artifact_registered(registry: Registry, artifact_id: str) -> bool:
    return artifact_id in registry.artifact_ids


def assert_registry_non_empty(registry: Registry) -> None:
    if not registry.artifact_ids:
        msg = "registry is empty; add artifacts to lab/registry.yaml before evaluate"
        raise RegistryError(msg)


def assert_artifact_registered(registry: Registry, artifact_id: str) -> None:
    if not is_artifact_registered(registry, artifact_id):
        msg = f"artifact {artifact_id!r} is not listed in lab/registry.yaml"
        raise RegistryError(msg)
