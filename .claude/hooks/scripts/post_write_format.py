#!/usr/bin/env python3
"""PostToolUse hook (matcher: Edit|Write). Formats the file Claude just touched.

Only handles Python (`black`, already a backend dependency). No JS/TS formatter
(e.g. prettier) is installed in this repo yet, so .js/.jsx files are left alone —
add prettier to frontend devDependencies and extend this script if that's wanted.
"""
import json
import os
import subprocess
import sys


def main():
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        sys.exit(0)

    file_path = payload.get("tool_input", {}).get("file_path", "")
    cwd = payload.get("cwd") or os.getcwd()

    if file_path.endswith(".py"):
        venv_black = os.path.join(cwd, "backend", ".venv", "Scripts", "python.exe")
        black_cmd = [venv_black, "-m", "black", "-q", file_path]
        if not os.path.exists(venv_black):
            black_cmd = ["python", "-m", "black", "-q", file_path]
        subprocess.run(black_cmd, cwd=cwd, capture_output=True, text=True)

    sys.exit(0)


if __name__ == "__main__":
    main()
