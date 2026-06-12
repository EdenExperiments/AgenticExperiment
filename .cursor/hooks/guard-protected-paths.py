#!/usr/bin/env python3
"""preToolUse guard: deny agent edits to protected paths.

Policy (see .cursor/rules/security-baseline.mdc and the composition contract):
  1. `.github/workflows/**` — workflow edits allowed during active pipeline iteration
     (D-061); re-enable WORKFLOW_PATTERNS deny when stabilised.
  2. While the TDD lock sentinel exists (created by the delivery orchestrator before
     dispatching an implementer subagent), test files are not editable either.

Output contract: JSON on stdout with {"permission": "allow"|"deny", ...}.
Fails open on malformed input so a hook bug never bricks unrelated edits.
"""

import fnmatch
import json
import os
import sys

TDD_LOCK_SENTINEL = ".cursor/tdd-lock"

# Re-enable when workflow hook hardening returns (see D-061).
# WORKFLOW_PATTERNS = [
#     "*.github/workflows/*",
#     ".github/workflows/*",
# ]

TEST_PATTERNS = [
    "*_test.go",
    "*.test.ts",
    "*.test.tsx",
    "*/__tests__/*",
    "*test_*.py",
    "*_test.py",
]


def extract_paths(tool_input):
    paths = []
    if not isinstance(tool_input, dict):
        return paths
    for key in ("path", "file_path", "target_file", "target_notebook"):
        value = tool_input.get(key)
        if isinstance(value, str) and value:
            paths.append(value)
    return paths


def matches(path, patterns):
    normalized = path.replace("\\", "/")
    return any(fnmatch.fnmatch(normalized, pattern) for pattern in patterns)


def main():
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        print(json.dumps({"permission": "allow"}))
        return

    paths = extract_paths(payload.get("tool_input"))
    tdd_lock_active = os.path.exists(TDD_LOCK_SENTINEL)

    for path in paths:
        if tdd_lock_active and matches(path, TEST_PATTERNS):
            print(
                json.dumps(
                    {
                        "permission": "deny",
                        "user_message": f"Blocked test-file edit during implementation run: {path}",
                        "agent_message": (
                            "The TDD lock is active (.cursor/tdd-lock exists): test files are "
                            "frozen during implementation. Make the implementation satisfy the "
                            "tests; if a test is genuinely wrong, stop and escalate to the "
                            "orchestrator."
                        ),
                    }
                )
            )
            return

    print(json.dumps({"permission": "allow"}))


if __name__ == "__main__":
    main()
