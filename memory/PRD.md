# Nofilter Lab — Premium Landing Page + Full Buying Flow

## Original Problem Statement
Build the website for **Nofilter Lab**, a premium skincare brand. Product = "THE CLEAR" (120 ml leave-on exfoliant, 2% BHA + Hyaluronic Acid). The site must feel Apple-caliber premium with a cinematic, scroll-driven product reveal (iPhone 17 Pro style). Audience: 60% women / 40% men, gender-neutral. Later: add full Apple-style buying process (cart → checkout wizard → payment).

## Architecture
- **Frontend**: React 19 + Tailwind + Framer Motion + react-router-dom + sonner + PostHog (in index.html).
- **Backend**: FastAPI + Motor (Mongo) + httpx + slowapi (rate limiter) + `emergentintegrations` (Stripe hosted checkout).
- **Data**: Mongo collections: `waitlist`, `payment_transactions`, `status_checks`.

## Backend Endpoints
- `GET  /api/products/{id}` — product catalog (backend-defined pricing).
- `GET  /api/shipping/options` — shipping options (standard 39 DKK / free over 400).
- `POST /api/checkout/quote` — server-side totals (subtotal/shipping/total, validates qty 1–5).
- `POST /api/checkout/session` — accepts full shipping address; creates Stripe checkout session; stores payment_transactions row with address + totals.
- `GET  /api/checkout/status/{session_id}` — polls Stripe, updates Mongo (idempotent for `paid`).
- `POST /api/webhook/stripe` — Stripe webhook receiver.
- `POST /api/waitlist` — Mongo dedupe + Resend welcome email. **Rate-limited to 5/hour per client IP (slowapi)**.
- `GET  /api/waitlist/count` — public count.

## Frontend routes
- `/` — Landing (scroll experience + details + how-to-use + buy block + FAQ + footer).
- `/checkout` — 3-step wizard (Shipping → Review → Payment redirect).
- `/success` — polls checkout status, clears cart + fires purchase analytics on paid state.

## Cart / Buying flow (Apple-style)
1. **Add to Bag** on landing → slide-in cart drawer (right, glass scrim) with quantity controls (1–5).
2. Cart drawer **Check out** button → `/checkout`.
3. `/checkout` step 1: Shipping details form with inline validation.
4. Step 2: Review order with editable shipping + total display + "Pay N DKK".
5. Step 3: redirects to Stripe hosted checkout (final card entry). On return: `/success?session_id=…`.
6. Success page polls, clears cart, fires `purchase` PostHog event.

## Cart persistence
- Read from `localStorage` **synchronously in useState initializer** (`nfl.cart.v1`) — no hydration race.
- Written back via `useEffect([items])`.

## Analytics events (PostHog wrapper `/lib/analytics.js`)
- `view_hero` — landing mount.
- `view_item` — Buy block IntersectionObserver (once).
- `add_to_cart` — Add to Bag CTA.
- `begin_checkout` — Cart drawer → Check out.
- `checkout_step` — `shipping_complete`, `proceed_to_payment`.
- `sign_up` — Waitlist success.
- `purchase` — Success page paid state.

## Test Reports
- `/app/test_reports/iteration_1.json` — 9/9 landing frontend.
- `/app/test_reports/iteration_2.json` — 10 backend + 6 frontend, all passed.
- `/app/test_reports/iteration_3.json` — 12/12 backend, ~85% frontend; 2 HIGH bugs found (both fixed in same iteration).

## What's Been Implemented (2025-12, iteration 3)
- Cart context + drawer (localStorage sync-init to avoid hydration race).
- 3-step /checkout wizard with server-verified totals and inline validation.
- Quantity selector on buy block + persistent nav bag count.
- Root Toaster (moved from BuyBlock to `App.js`).
- slowapi rate limit (5/hour per IP) on `/api/waitlist`, respects `X-Forwarded-For`.
- PostHog analytics wired end-to-end (view_hero, view_item, add_to_cart, begin_checkout, checkout_step, sign_up, purchase).

## Deferred / Backlog
- **P1: Danish locale variant** — full copy translations map + language toggle in Nav (biggest single-feature deferral).
- **P1: Embedded Stripe Payment Element** — requires the Emergent-managed publishable key; currently blocked by shared-secret constraint. Falls back to hosted checkout redirect after review step.
- **P2: Bundle upsell** in cart drawer (3-pack save 150 DKK).
- **P2: Address autocomplete** (Danish postal API).
- **P2: Real webhook verification** with Stripe signing secret (currently accepts any webhook body).
- **P2: Order history / customer accounts.**

## Key Files
- `/app/backend/server.py`
- `/app/frontend/src/App.js`, `/pages/Landing.js`, `/pages/Checkout.js`, `/pages/Success.js`
- `/app/frontend/src/context/CartContext.js`
- `/app/frontend/src/components/{Nav,CartDrawer,ScrollExperience,SplitReveal,DetailsScene,HowToUse,BuyBlock,Faq,Footer}.js`
- `/app/frontend/src/lib/analytics.js`
