---
name: api-docs
description: Reference for this repo's backend API surface (endpoints and data models). Use when building/modifying a frontend call to the backend, or adding/changing a backend endpoint, to stay consistent with the existing contract.
---

Read `references/endpoints.md` and `references/data-models.md` for the current `/api` surface.

These are generated from reading `backend/server.py` directly — if you're changing an endpoint, update these reference files in the same change so they don't drift. If they ever disagree with `backend/server.py`, the code wins; fix the docs.
