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
    py_files = [f for f in files if f.endswith(".py") and f.startswith("backend/")]
    js_files = [f for f in files if f.endswith((".js", ".jsx")) and f.startswith("frontend/src/")]

    errors = []

    if py_files:
        venv_flake8 = os.path.join(cwd, "backend", ".venv", "Scripts", "python.exe")
        flake8_cmd = [venv_flake8, "-m", "flake8", "--max-line-length=120"] + py_files
        if not os.path.exists(venv_flake8):
            flake8_cmd = ["python", "-m", "flake8", "--max-line-length=120"] + py_files
        r = subprocess.run(flake8_cmd, cwd=cwd, capture_output=True, text=True)
        if r.returncode != 0:
            errors.append("flake8 (backend):\n" + r.stdout + r.stderr)

    if js_files:
        rel = [os.path.relpath(f, "frontend") for f in js_files]
        r = subprocess.run(
            ["yarn", "eslint", "--max-warnings=0"] + rel,
            cwd=os.path.join(cwd, "frontend"),
            capture_output=True, text=True, shell=(os.name == "nt"),
        )
        if r.returncode != 0:
            errors.append("eslint (frontend):\n" + r.stdout + r.stderr)

    if errors:
        print("\n\n".join(errors), file=sys.stderr)
        sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()
