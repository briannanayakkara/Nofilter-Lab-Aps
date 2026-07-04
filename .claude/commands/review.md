---
description: Review the current diff for correctness, security, and consistency with this repo's conventions
---

Review the pending changes (`git diff` and `git status` for untracked files) in this repo.

Use the `code-reviewer` subagent. Focus on:
- Server-authoritative pricing/shipping totals not being bypassed (`backend/server.py`).
- Cart state going through `CartContext`, not ad-hoc `localStorage` access.
- New analytics events routed through `frontend/src/lib/analytics.js`.
- No secrets committed, no silently-defaulted env vars.

Report findings as file:line + issue + why it matters. Skip anything that's just a pre-existing pattern being repeated consistently.
