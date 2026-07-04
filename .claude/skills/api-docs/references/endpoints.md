# API Endpoints

All routes are mounted under `/api` (`backend/server.py`, `api_router`).

| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | `/api/` | Health/root message | |
| POST | `/api/status` | Create a status check record | kept from the original template |
| POST | `/api/waitlist` | Email signup + welcome email | Rate-limited 5/hour per client IP; dedupes by email |
| GET | `/api/waitlist/count` | Public subscriber count | |
| GET | `/api/products/{product_id}` | Look up a product | 404 if unknown; backend-defined catalog (`PRODUCTS`) |
| GET | `/api/shipping/options` | List shipping options | backend-defined (`SHIPPING_OPTIONS`) |
| POST | `/api/checkout/quote` | Server-computed totals | Validates `product_id`, `shipping_option`, quantity 1–5. Client price input is never trusted. |
| POST | `/api/checkout/session` | Create Stripe checkout session | Recomputes totals server-side; stores a `payment_transactions` doc with status `initiated`; returns Stripe-hosted checkout `url` + `session_id` |
| GET | `/api/checkout/status/{session_id}` | Poll payment status | Returns cached result if already `paid` (idempotent); otherwise polls Stripe |
| POST | `/api/webhook/stripe` | Stripe webhook receiver | **Known gap**: does not currently verify the Stripe signing secret (see `memory/PRD.md` backlog) |

## Request/response shapes

See `references/data-models.md` for the Pydantic models backing these routes.

## Conventions

- Quantity is always 1–5, enforced server-side on both `/checkout/quote` and `/checkout/session`.
- Currency is DKK; amounts are floats in major units (not minor/cent units).
- Shipping is free over 400 DKK subtotal, otherwise a flat 39 DKK (`standard` option) — see `_compute_totals` in `server.py` if adding a new shipping option.
