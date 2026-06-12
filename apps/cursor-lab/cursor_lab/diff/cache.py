"""SQLite-backed evaluation result cache."""

from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class CachedVerdict:
    artifact_id: str
    fingerprint: str
    score_mean: float
    score_std: float
    success_rate: float
    process_mean: float
    promoted: bool


class ResultCache:
    def __init__(self, db_path: Path) -> None:
        self._db_path = db_path
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS artifact_runs (
                  artifact_id TEXT NOT NULL,
                  case_id TEXT NOT NULL,
                  seed_index INTEGER NOT NULL,
                  fingerprint TEXT NOT NULL,
                  run_id TEXT,
                  agent_id TEXT,
                  status TEXT,
                  weighted_score REAL,
                  process_adherence REAL,
                  result_text TEXT,
                  diff_text TEXT,
                  raw_json TEXT,
                  created_at TIMESTAMP NOT NULL,
                  PRIMARY KEY (artifact_id, case_id, seed_index, fingerprint)
                );

                CREATE TABLE IF NOT EXISTS artifact_verdicts (
                  artifact_id TEXT NOT NULL,
                  fingerprint TEXT NOT NULL,
                  score_mean REAL,
                  score_std REAL,
                  success_rate REAL,
                  process_mean REAL,
                  promoted INTEGER NOT NULL DEFAULT 0,
                  created_at TIMESTAMP NOT NULL,
                  PRIMARY KEY (artifact_id, fingerprint)
                );
                """
            )

    def has_verdict(self, artifact_id: str, fingerprint: str) -> bool:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT 1 FROM artifact_verdicts WHERE artifact_id = ? AND fingerprint = ?",
                (artifact_id, fingerprint),
            ).fetchone()
        return row is not None

    def get_verdict(self, artifact_id: str, fingerprint: str) -> CachedVerdict | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT artifact_id, fingerprint, score_mean, score_std, success_rate,
                       process_mean, promoted
                FROM artifact_verdicts
                WHERE artifact_id = ? AND fingerprint = ?
                """,
                (artifact_id, fingerprint),
            ).fetchone()
        if row is None:
            return None
        return CachedVerdict(
            artifact_id=row["artifact_id"],
            fingerprint=row["fingerprint"],
            score_mean=float(row["score_mean"]),
            score_std=float(row["score_std"]),
            success_rate=float(row["success_rate"]),
            process_mean=float(row["process_mean"]),
            promoted=bool(row["promoted"]),
        )

    def store_verdict(
        self,
        *,
        artifact_id: str,
        fingerprint: str,
        score_mean: float,
        score_std: float,
        success_rate: float,
        process_mean: float,
        promoted: bool = False,
    ) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO artifact_verdicts (
                  artifact_id, fingerprint, score_mean, score_std, success_rate,
                  process_mean, promoted, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    artifact_id,
                    fingerprint,
                    score_mean,
                    score_std,
                    success_rate,
                    process_mean,
                    int(promoted),
                    now,
                ),
            )

    def store_run(
        self,
        *,
        artifact_id: str,
        case_id: str,
        seed_index: int,
        fingerprint: str,
        record: dict[str, Any],
    ) -> None:
        verdict = record.get("judge_verdict") or {}
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO artifact_runs (
                  artifact_id, case_id, seed_index, fingerprint, run_id, agent_id,
                  status, weighted_score, process_adherence, result_text, diff_text,
                  raw_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    artifact_id,
                    case_id,
                    seed_index,
                    fingerprint,
                    record.get("run_id"),
                    record.get("agent_id"),
                    record.get("status"),
                    verdict.get("weighted_score"),
                    verdict.get("process_adherence"),
                    record.get("result_text"),
                    json.dumps(record.get("file_diffs", [])),
                    json.dumps(record),
                    now,
                ),
            )

    def list_promotable(self, lab_home_fingerprints: dict[str, str]) -> list[CachedVerdict]:
        """Return cached verdicts that pass gate thresholds (promoted flag may still be false)."""
        results: list[CachedVerdict] = []
        for artifact_id, fingerprint in lab_home_fingerprints.items():
            verdict = self.get_verdict(artifact_id, fingerprint)
            if verdict is not None:
                results.append(verdict)
        return results
