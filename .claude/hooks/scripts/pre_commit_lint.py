#!/usr/bin/env python3
"""PreToolUse hook (matcher: Bash). Lints staged files before letting `git commit` run.

Only lints files actually staged for this commit (not the whole tree) so
pre-existing, unrelated violations elsewhere in the repo never block a commit.
Exit 2 blocks the commit; stderr (lint output) is surfaced back to Claude.
"""
import json
import os
import re
import subprocess
import sys


def staged_files(cwd):
    r = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
        cwd=cwd, capture_output=True, text=True,
    )
    return [f for f in r.stdout.splitlines() if f.strip()]


def main():
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        sys.exit(0)

    command = payload.get("tool_input", {}).get("command", "")
    if not re.search(r"\bgit\s+commit\b", command):
        sys.exit(0)

    cwd = payload.get("cwd") or os.getcwd()
    files = staged_files(cwd)
    js_files = [f for f in files if f.endswith((".js", ".jsx")) and f.startswith("src/")]

    errors = []

    if js_files:
        r = subprocess.run(
            ["npx", "eslint", "--max-warnings=0"] + js_files,
            cwd=cwd,
            capture_output=True, text=True, shell=(os.name == "nt"),
        )
        if r.returncode != 0:
            errors.append("eslint:\n" + r.stdout + r.stderr)

    if errors:
        print("\n\n".join(errors), file=sys.stderr)
        sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()
