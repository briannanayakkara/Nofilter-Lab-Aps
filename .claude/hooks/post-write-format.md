# post-write-format

Formats a file immediately after Claude writes or edits it, so formatting never drifts from the rest of the repo.

**Trigger**: `PostToolUse` matching `Edit|Write`.

**Intent**: run the appropriate formatter based on the file extension — there is no `prettier` or `black` config committed in this repo yet, so this hook has nothing to invoke until one of those is added.

**Status: active, Python only.** Implemented as `.claude/hooks/scripts/post_write_format.py`, wired into `.claude/settings.local.json`'s `PostToolUse` → `Edit|Write` matcher. Runs `black` (via the backend `.venv`, already a dependency) on any `.py` file Claude writes/edits. `.js`/`.jsx` files are left alone — there's no `prettier` in `frontend/devDependencies` yet; add it and extend the script if you want that too.
