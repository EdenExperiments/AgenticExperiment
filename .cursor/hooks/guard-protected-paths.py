#!/usr/bin/env python3
"""preToolUse guard: deny agent edits to protected paths.

Policy (see .cursor/rules/security-baseline.mdc and the composition contract):
  1. `.github/workflows/**` — workflow edits allowed during active pipeline iteration
     (D-061); re-enable WORKFLOW_PATTERNS deny when stabilised.
  2. TDD lock retired (D-063): Pillar D delivery subagents and `.cursor/tdd-lock` are gone.

Output contract: JSON on stdout with {"permission": "allow"|"deny", ...}.
Fails open on malformed input so a hook bug never bricks unrelated edits.
"""

import json
import sys

# Re-enable when workflow hook hardening returns (see D-061).
# WORKFLOW_PATTERNS = [
#     "*.github/workflows/*",
#     ".github/workflows/*",
# ]


def main():
    try:
        json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        print(json.dumps({"permission": "allow"}))
        return

    print(json.dumps({"permission": "allow"}))


if __name__ == "__main__":
    main()
