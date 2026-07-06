#!/usr/bin/env python3
"""PostToolUse hook (matcher: Edit|Write). Formats the file Claude just touched.

Only handles Python (`black`) — there's no backend anymore, so this only ever
applies to files like .claude/hooks/scripts/*.py. Silently does nothing if
`black` isn't installed (this repo has no Python dependency file to install it
from). No JS/TS formatter (e.g. prettier) is installed for the frontend yet,
so .js/.jsx files are left alone — add prettier and extend this script if wanted.
"""
import json
import subprocess
import sys


def main():
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        sys.exit(0)

    file_path = payload.get("tool_input", {}).get("file_path", "")

    if file_path.endswith(".py"):
        try:
            subprocess.run(["python", "-m", "black", "-q", file_path], capture_output=True, text=True)
        except FileNotFoundError:
            pass

    sys.exit(0)


if __name__ == "__main__":
    main()
