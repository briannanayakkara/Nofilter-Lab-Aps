# block-dangerous-ops

Blocks destructive shell commands outright, as a hard backstop beyond relying on Claude's own judgment.

**Trigger**: `PreToolUse` matching `Bash`.

**Intent**: reject commands matching known-destructive patterns for this repo specifically:
- `git push --force` / `git push -f` to `main`
- `rm -rf` outside the scratchpad
- anything touching `.env`, `shopify-config.js`, or other credential files (delete/overwrite)
- `git reset --hard`

**Status: active.** Implemented as `.claude/hooks/scripts/block_dangerous_ops.py` (reads the hook's stdin JSON payload, regex-matches `tool_input.command`) and wired into `.claude/settings.local.json`'s `PreToolUse` → `Bash` matcher. Exit code `2` blocks the tool call and returns stderr as the reason shown to Claude.

It's a blunt string match and can false-positive (e.g. a commit message that merely mentions "reset --hard") — review `DANGEROUS_PATTERNS` in the script if that happens.
