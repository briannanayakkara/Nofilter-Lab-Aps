#!/usr/bin/env python3
"""PreToolUse hook (matcher: Bash). Blocks known-destructive shell commands.

Reads the Claude Code hook JSON payload from stdin:
  {"tool_name": "Bash", "tool_input": {"command": "...", ...}, "cwd": "...", ...}
Exit 2 blocks the tool call; stderr is surfaced back to Claude as the reason.
"""
import json
import re
import sys

DANGEROUS_PATTERNS = [
    r"push\s+(--force|-f)\b",
    r"\brm\s+-rf\b",
    r"reset\s+--hard",
    r"\bgit\s+clean\s+-[a-z]*f",
    r"branch\s+-D\b",
]


def main():
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        sys.exit(0)  # can't parse — don't block on our own failure

    command = payload.get("tool_input", {}).get("command", "")
    for pattern in DANGEROUS_PATTERNS:
        if re.search(pattern, command):
            print(
                f"blocked by block-dangerous-ops: command matches pattern `{pattern}` — "
                f"if intentional, ask the user to run it manually.",
                file=sys.stderr,
            )
            sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()
