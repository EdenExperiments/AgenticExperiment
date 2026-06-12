"""CLI entry: `cursor-lab`."""

from __future__ import annotations

import argparse
import os
import shutil
import sys
import tempfile
from pathlib import Path

from cursor_lab.bridge.cursor_agent_bridge import CursorAgentBridge
from cursor_lab.discovery import discover_artifacts
from cursor_lab.judge.judge import (
    probe_judge_consistency,
    scores_within_epsilon,
)
from cursor_lab.orchestrator import EvaluateOptions, EvaluationAborted, run_evaluation
from cursor_lab.promotion.promote import promote_passing_artifacts
from cursor_lab.registry import (
    RegistryError,
    assert_artifact_registered,
    assert_registry_non_empty,
    load_registry,
)
from cursor_lab.reporting.json_report import find_latest_report_dir, write_reports


def _lab_home() -> Path:
    raw = os.environ.get("CURSOR_LAB_HOME")
    if raw:
        return Path(raw).resolve()
    return Path(__file__).resolve().parent.parent


def cmd_evaluate(args: argparse.Namespace) -> int:
    home = _lab_home()
    try:
        registry = load_registry(home)
        assert_registry_non_empty(registry)
        if args.artifact:
            assert_artifact_registered(registry, args.artifact)
    except RegistryError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    print("registry gate: ok")

    api_key = os.environ.get("CURSOR_API_KEY")
    if not api_key:
        print("error: CURSOR_API_KEY is not set.", file=sys.stderr)
        return 1

    judge = None
    if os.environ.get("CURSOR_LAB_JUDGE_API_KEY"):
        from cursor_lab.judge.judge import ArtifactJudge, configure_judge_lm

        configure_judge_lm()
        judge = ArtifactJudge()

    options = EvaluateOptions(artifact_id=args.artifact, force=args.force)
    try:
        result = run_evaluation(home, registry=registry, options=options, judge=judge)
    except EvaluationAborted as exc:
        print(f"error: evaluation aborted: {exc}", file=sys.stderr)
        return 1

    print(f"Wrote {result.run_count} run(s) to {result.runs_path}")
    if result.cache_hits:
        print(f"Reused {result.cache_hits} cached artifact verdict(s).")
    return 0


def cmd_report(args: argparse.Namespace) -> int:
    home = _lab_home()
    report_dir = None
    if args.timestamp:
        report_dir = home / "reports" / args.timestamp
        if not report_dir.is_dir():
            print(f"error: report directory not found: {report_dir}", file=sys.stderr)
            return 1
    else:
        report_dir = find_latest_report_dir(home)
        if report_dir is None:
            print("error: no evaluation reports found.", file=sys.stderr)
            return 1

    try:
        out = write_reports(home, report_dir=report_dir)
    except FileNotFoundError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    print(f"Wrote {out['json']}")
    print(f"Wrote {out['markdown']}")
    return 0


def cmd_promote(args: argparse.Namespace) -> int:
    home = _lab_home()
    try:
        registry = load_registry(home)
        assert_registry_non_empty(registry)
    except RegistryError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    result = promote_passing_artifacts(
        home,
        registry=registry,
        apply_to_repo=args.apply_to_repo,
    )
    print(result.message)
    return 0


def cmd_list(_args: argparse.Namespace) -> int:
    home = _lab_home()
    arts = discover_artifacts(home)
    if not arts:
        print(f"No artifacts under {home / 'lab' / '.cursor'}")
        return 0
    for a in arts:
        print(f"{a.artifact_id}")
    return 0


def cmd_doctor(args: argparse.Namespace) -> int:
    home = _lab_home()
    print(f"CURSOR_LAB_HOME={home}")

    if not shutil.which("pnpm"):
        print("error: pnpm not found on PATH (required to run the Node bridge).")
        return 1

    rg = os.environ.get("CURSOR_RIPGREP_PATH") or shutil.which("rg")
    if rg:
        print(f"ripgrep: {rg}")
    else:
        print("warning: no rg on PATH and CURSOR_RIPGREP_PATH unset (SDK may warn in CI)")

    api_key = os.environ.get("CURSOR_API_KEY")
    if not api_key:
        print("error: CURSOR_API_KEY is not set.")
        return 1

    judge_key = os.environ.get("CURSOR_LAB_JUDGE_API_KEY")
    judge_model = os.environ.get("CURSOR_LAB_JUDGE_MODEL")
    if judge_key and judge_model:
        print(f"judge model: {judge_model}")
    elif not args.deps_only:
        print("warning: CURSOR_LAB_JUDGE_API_KEY or CURSOR_LAB_JUDGE_MODEL unset (judge probe skipped)")

    if args.deps_only:
        print("deps-only: skipping Agent.prompt smoke test.")
        return 0

    bridge_ts = home / "cursor_lab" / "bridge" / "node_bridge" / "run-agent.ts"
    if not bridge_ts.is_file():
        print(f"error: bridge not found at {bridge_ts}")
        return 1

    with tempfile.TemporaryDirectory(prefix="cursor-lab-doctor-") as tmp:
        tdir = Path(tmp)
        (tdir / "README.txt").write_text("cursor-lab doctor sandbox\n", encoding="utf-8")

        bridge = CursorAgentBridge(api_key=api_key)
        prompt = (
            "You are running a connectivity smoke test. "
            "Reply with exactly one line containing only the word: pong"
        )
        print("Running Agent.prompt smoke test (uses API quota)…")
        result = bridge.run_once(cwd=tdir, prompt=prompt, timeout_s=min(args.timeout_s, 120))

        if result.stderr:
            print("--- bridge stderr (tail) ---")
            print(result.stderr[-2000:])

        if not result.ok:
            print("error: bridge returned ok=false")
            print(result.raw)
            return 1

        text = (result.raw.get("result") or "").strip().lower()
        if "pong" not in text:
            print(
                "warning: unexpected model output (expected 'pong' somewhere):",
                repr(result.raw.get("result")),
            )
        else:
            print("smoke test: ok (saw 'pong' in response).")

        if judge_key and judge_model:
            print("Running judge consistency probe…")
            try:
                first, second = probe_judge_consistency()
                if scores_within_epsilon(first, second):
                    print("judge consistency: ok (scores within epsilon).")
                else:
                    print(
                        "warning: judge consistency drift "
                        f"(weighted {first.weighted_score:.3f} vs {second.weighted_score:.3f})."
                    )
            except Exception as exc:  # noqa: BLE001 — doctor surfaces probe failures
                print(f"warning: judge consistency probe failed: {exc}")

        print("raw:", result.raw)
        return 0


def main() -> None:
    parser = argparse.ArgumentParser(prog="cursor-lab")
    sub = parser.add_subparsers(dest="command", required=True)

    p_doc = sub.add_parser("doctor", help="Check deps, env, and run a minimal SDK prompt.")
    p_doc.add_argument(
        "--deps-only",
        action="store_true",
        help="Skip Agent.prompt (no API usage); verify pnpm and keys only.",
    )
    p_doc.add_argument(
        "--timeout-s",
        type=int,
        default=120,
        help="Max seconds for smoke-test Agent.prompt (default 120).",
    )
    p_doc.set_defaults(func=cmd_doctor)

    p_list = sub.add_parser("list", help="List artifacts discovered under lab/.cursor/")
    p_list.set_defaults(func=cmd_list)

    p_eval = sub.add_parser("evaluate", help="Run artifact evaluation.")
    p_eval.add_argument(
        "--artifact",
        help="Limit evaluation to a single artifact id (e.g. skill:skills/core/foo).",
    )
    p_eval.add_argument(
        "--force",
        action="store_true",
        help="Ignore cached verdicts and re-run evaluation.",
    )
    p_eval.set_defaults(func=cmd_evaluate)

    p_report = sub.add_parser("report", help="Write reports/latest.json and latest.md.")
    p_report.add_argument(
        "--timestamp",
        help="Optional reports/<timestamp>/ directory to summarize (default: latest run).",
    )
    p_report.set_defaults(func=cmd_report)

    p_promote = sub.add_parser("promote", help="Copy passing artifacts from lab/ to prod/.")
    p_promote.add_argument(
        "--apply-to-repo",
        action="store_true",
        help="Also copy promoted artifacts into the repo-root .cursor/ (prints paths).",
    )
    p_promote.set_defaults(func=cmd_promote)

    args = parser.parse_args()
    code = args.func(args)
    raise SystemExit(code)


if __name__ == "__main__":
    main()
