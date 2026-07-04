# Access Patterns

MongoDB has no built-in row-level security, so authorization/validation lives entirely in the FastAPI layer. Keep this in mind before assuming "the database enforces it."

## What's enforced today

- **Pricing integrity**: `/api/checkout/*` endpoints never accept a client-supplied price — totals are recomputed server-side from `PRODUCTS`/`SHIPPING_OPTIONS` on every request (`_compute_totals`). This is the main "security" boundary in the app today.
- **Rate limiting**: `/api/waitlist` is limited to 5/hour per client IP via `slowapi`, keyed off `X-Forwarded-For` when present.
- **Webhook trust**: `/api/webhook/stripe` currently accepts any webhook body without verifying the Stripe signing secret — this is a known gap, tracked in `memory/PRD.md`'s backlog as "Real webhook verification with Stripe signing secret." Don't assume webhook payloads are authentic until that's fixed.

## What's NOT enforced (no user accounts yet)

- There is no auth/session layer — all endpoints are effectively public. `payment_transactions` and `waitlist` have no per-user ownership concept.
- If a feature needs "only the customer who placed this order can see it," that requires adding an auth layer first — don't bolt on a filter that assumes an identity that doesn't exist yet.

## Adding a new collection

Ask: does this data need to be scoped to a specific user/session? If yes, and there's no auth system yet, flag that as a prerequisite rather than inventing an ad-hoc scoping scheme (e.g. trusting a client-sent email as an identity key) — that's how the pricing bug class happens on the auth side too.
