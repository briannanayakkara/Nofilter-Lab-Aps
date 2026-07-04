---
description: Sanity-check this repo is deployable before pushing/releasing
---

Check whether the Nofilter Lab app is in a deployable state:

1. Backend: confirm `backend/requirements.txt` installs cleanly and required env vars (`MONGO_URL`, `DB_NAME`, `STRIPE_API_KEY`, email config, etc.) are all read from `backend/.env` / the deployment environment — none hardcoded in `server.py`. Run the backend test suite (`test-runner` subagent).
2. Frontend: confirm `yarn build` (via `craco build`) succeeds cleanly with no missing dependency warnings.
3. Confirm no `.env`, credentials, or API keys are staged for commit (`git status` + inspect anything unfamiliar).
4. Confirm `memory/PRD.md`'s deferred/backlog section doesn't contain anything silently assumed "done" by the current diff.

Report a pass/fail checklist, not prose — one line per check.
