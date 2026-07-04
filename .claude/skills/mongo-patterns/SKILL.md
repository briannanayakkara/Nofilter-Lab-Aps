---
name: mongo-patterns
description: MongoDB/Motor data access patterns used in this repo — collections, query shapes, and authorization approach. Use before adding a new collection, query, or write path in backend/server.py.
---

This repo uses MongoDB via Motor's async client (`AsyncIOMotorClient`), not Supabase/Postgres — there is no RLS layer; authorization is enforced entirely in the FastAPI route handlers.

Read:
- `references/query-patterns.md` for how existing queries/writes are structured.
- `references/access-patterns.md` for how authorization is (and isn't) enforced, since there's no database-level RLS to lean on.

Before adding a new collection, check `memory/PRD.md`'s Architecture section for the current collection list (`waitlist`, `payment_transactions`, `status_checks`) and confirm a new one is actually justified rather than reusing an existing shape.
