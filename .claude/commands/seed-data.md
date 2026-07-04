---
description: Seed local MongoDB with representative data for manual testing
---

Seed the local MongoDB instance (`MONGO_URL` / `DB_NAME` from `backend/.env`) with representative data for manual testing of the Nofilter Lab app:

- `waitlist`: a handful of sample subscriber docs (matching the shape in `backend/server.py`'s `waitlist_signup` — `id`, `email`, `source`, `created_at`).
- `payment_transactions`: a few sample rows covering `pending`, `paid`, and `expired`-equivalent states, if the collection schema is present in `server.py`.
- `status_checks`: a couple of sample rows matching the `StatusCheck` model.

Read `backend/server.py` first to confirm the exact document shape for each collection before inserting — don't guess field names. Use a short Python script via `motor`/`pymongo` against `MONGO_URL`, and delete it after running (don't leave a seed script behind unless asked).
