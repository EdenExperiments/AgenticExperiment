#!/usr/bin/env python3
"""beforeShellExecution guard: deny shell paths around the file-edit guard.

Blocks shell commands that (a) write into .github/workflows/** (bypassing the
preToolUse edit guard), or (b) are categorically destructive (force-push, rm -rf
on root-ish paths). Everything else is allowed; this is a guardrail, not an
allowlist.
"""

import json
import re
import sys

DENY_RULES = [
    (
        re.compile(
            r"(>>?|\btee\b|\bsed\s+-i|\bmv\b|\bcp\b|\brm\b|\btouch\b)[^\n]*\.github/workflows/",
        ),
        "Shell writes to .github/workflows/** are denied by policy (security baseline).",
    ),
    (
        re.compile(r"\bgit\s+push\b[^\n]*(--force\b|--force-with-lease\b|\s-f\b)"),
        "Force-pushing is denied by policy. Push normally or escalate to a human.",
    ),
    (
        re.compile(r"\brm\s+(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r)\s+(/|~)(\s|$)"),
        "Recursive force-delete of root/home paths is denied by policy.",
    ),
]


def main():
    try:
        payload = json.load(sys.stdin)
        command = payload.get("command", "") or ""
    except (json.JSONDecodeError, ValueError):
        print(json.dumps({"permission": "allow"}))
        return

    for pattern, message in DENY_RULES:
        if pattern.search(command):
            print(
                json.dumps(
                    {
                        "permission": "deny",
                        "user_message": message,
                        "agent_message": message,
                    }
                )
            )
            return

    print(json.dumps({"permission": "allow"}))


if __name__ == "__main__":
    main()
