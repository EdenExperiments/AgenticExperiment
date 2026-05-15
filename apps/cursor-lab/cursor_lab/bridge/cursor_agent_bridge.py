from __future__ import annotations

import json
import os
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any


def package_dir() -> Path:
    """Directory containing `pyproject.toml` (apps/cursor-lab)."""
    return Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class BridgeRunResult:
    ok: bool
    raw: dict[str, Any]
    stderr: str


class CursorAgentBridge:
    """Spawn the Node bridge (`run-agent.ts`) with `CURSOR_API_KEY` in the child environment."""

    def __init__(
        self,
        api_key: str,
        model_id: str = "composer-2",
        node_cmd: list[str] | None = None,
    ) -> None:
        self._api_key = api_key
        self._model_id = model_id
        self._node_cmd = node_cmd
        self._pkg = package_dir()

    def run_once(
        self,
        *,
        cwd: Path,
        prompt: str,
        executor_mode: str = "prompt",
        timeout_s: int = 600,
        mcp_servers: list[dict[str, Any]] | None = None,
    ) -> BridgeRunResult:
        req: dict[str, Any] = {
            "executorMode": executor_mode,
            "model": {"id": self._model_id},
            "cwd": str(cwd.resolve()),
            "prompt": prompt,
            "settingSources": [],
            "timeoutMs": timeout_s * 1000,
        }
        if mcp_servers is not None:
            req["mcpServers"] = mcp_servers

        cmd = self._node_cmd
        if cmd is None:
            pnpm = shutil.which("pnpm")
            if not pnpm:
                return BridgeRunResult(
                    ok=False,
                    raw={"error": "pnpm not found on PATH"},
                    stderr="",
                )
            cmd = [
                pnpm,
                "exec",
                "tsx",
                "cursor_lab/bridge/node_bridge/run-agent.ts",
            ]

        proc = subprocess.run(
            cmd,
            cwd=str(self._pkg),
            env={**os.environ, "CURSOR_API_KEY": self._api_key},
            input=json.dumps(req),
            text=True,
            capture_output=True,
            timeout=timeout_s + 90,
            check=False,
        )
        stderr = (proc.stderr or "").strip()
        out = (proc.stdout or "").strip()
        if not out:
            return BridgeRunResult(
                ok=False,
                raw={
                    "error": "empty_stdout",
                    "returncode": proc.returncode,
                    "stderr_tail": stderr[-4000:],
                },
                stderr=stderr,
            )
        line = out.splitlines()[-1]
        try:
            raw = json.loads(line)
        except json.JSONDecodeError:
            return BridgeRunResult(
                ok=False,
                raw={
                    "error": "invalid_json",
                    "line_preview": line[:500],
                    "stderr_tail": stderr[-4000:],
                },
                stderr=stderr,
            )
        if not isinstance(raw, dict):
            return BridgeRunResult(ok=False, raw={"error": "not_object"}, stderr=stderr)
        return BridgeRunResult(ok=bool(raw.get("ok")), raw=raw, stderr=stderr)
