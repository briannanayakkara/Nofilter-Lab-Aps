# pre-commit-lint

Runs linting before a git commit is created, so Claude never commits code that fails lint.

**Trigger**: `PreToolUse` matching `Bash` where the command is a `git commit`.

**Intent**: block the commit if `eslint` (frontend) or a Python lint check (backend) fails; surface the lint errors back to Claude so it fixes them before retrying the commit.

**Status: active.** Implemented as `.claude/hooks/scripts/pre_commit_lint.py`, wired into `.claude/settings.local.json`'s `PreToolUse` → `Bash` matcher. It only fires when the Bash command matches `git commit`, and only lints files actually staged for that commit (via `git diff --cached --name-only`) — pre-existing violations elsewhere in the repo never block a commit. Runs `npx eslint` on staged `src/*.js(x)` files; exit `2` with the lint output blocks the commit. There is no backend anymore, so the flake8 half of this hook was removed.
