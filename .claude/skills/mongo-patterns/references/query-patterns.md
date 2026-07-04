# Query Patterns

Based on actual usage in `backend/server.py`.

## Client / DB setup

```python
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]
```

One client for the process lifetime; no per-request connection handling needed (Motor pools internally).

## Reads

- Point lookups exclude `_id` from the projection so results are directly JSON-serializable:
  ```python
  existing = await db.waitlist.find_one({"email": email}, {"_id": 0})
  ```
- Counts: `await db.waitlist.count_documents({})`.

## Writes

- Insert plain dicts built explicitly (not `model_dump()` of the raw Pydantic model when a field needs transforming, e.g. timestamps to ISO strings first):
  ```python
  doc = {
      "id": str(uuid.uuid4()),
      "email": email,
      "source": payload.source or "footer",
      "created_at": datetime.now(timezone.utc).isoformat(),
  }
  await db.waitlist.insert_one(doc)
  ```
- Dedup-before-insert is done with an explicit `find_one` check first (see `waitlist_signup`), not a unique index + catch — if a new collection needs stronger dedup guarantees than "check then insert," that's a gap worth flagging rather than silently copying this pattern.

## Collections (current)

| Collection | Purpose | Key fields |
|---|---|---|
| `waitlist` | Email signups | `id`, `email`, `source`, `created_at` |
| `payment_transactions` | Stripe checkout sessions | shipping address + totals (see `checkout/session` handler) |
| `status_checks` | Health-check style records kept from the original template | `id`, `client_name`, `timestamp` |

Verify against `backend/server.py` directly before relying on this table — it's a summary, not the source of truth.
