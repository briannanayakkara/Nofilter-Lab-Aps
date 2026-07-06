# Nofilter Lab — Premium Landing Page + Full Buying Flow

## Original Problem Statement
Build the website for **Nofilter Lab**, a premium skincare brand. Product = "THE CLEAR" (120 ml leave-on exfoliant, 2% BHA + Hyaluronic Acid). The site must feel Apple-caliber premium with a cinematic, scroll-driven product reveal (iPhone 17 Pro style). Audience: 60% women / 40% men, gender-neutral. Later: add full Apple-style buying process (cart → checkout wizard → payment).

## Architecture
- **Frontend**: React 19 + Tailwind + Framer Motion + react-router-dom + sonner + PostHog (in index.html).
- **Backend**: FastAPI + Motor (Mongo) + httpx + slowapi (rate limiter) + `stripe` SDK (Stripe hosted checkout) + Resend (transactional email, direct API).
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

## What's Been Implemented (2026-07-04 → 2026-07-06)
- **Removed the Emergent platform dependency entirely** (project was originally scaffolded by Emergent; now maintained directly with Claude Code):
  - `emergentintegrations` Stripe wrapper replaced with the official `stripe` Python SDK (async), including real webhook signature verification via `stripe.Webhook.construct_event` when `STRIPE_WEBHOOK_SECRET` is set — this also resolves the "Real webhook verification" backlog item below (see caveat).
  - Emergent's managed email proxy replaced with a direct Resend API call (`_send_welcome_email` in `backend/server.py`); gracefully no-ops (logs a warning, returns `None`) when `RESEND_API_KEY` isn't set, so waitlist signup never breaks on missing email config.
  - `@emergentbase/visual-edits` craco plugin and the "Made with Emergent" badge/script removed from `frontend/public/index.html` and `frontend/craco.config.js`.
  - `.emergent/` metadata folder and the tracked Emergent-identity `.gitconfig` deleted.
  - See `git log` around commit `58873a8` for the full diff.
- **Added `.claude/` project configuration** for working with Claude Code going forward: 5 subagents (code-reviewer, debugger, test-runner, planner, researcher), 5 slash commands (`/review`, `/plan`, `/fix-issue`, `/deploy-check`, `/seed-data`), 3 hooks (block-dangerous-ops, pre-commit-lint, post-write-format — all live, see `.claude/settings.local.json`), and 5 skills (code-style, mongo-patterns, api-docs, testing-patterns, planning) — all grounded in this repo's actual code, not generic boilerplate.
- **Sticky nav purchase bar** (`frontend/src/components/Nav.js`): the only "Add to bag" control used to live inside `BuyBlock`, below the full cinematic hero scroll. Nav now reuses its existing scroll-position state (`darkTheme`, flips once scrolled past the hero) to swap its center nav-links for a "THE CLEAR — 349 DKK" + "Add to bag" CTA on desktop, and shows a compact "Buy" button next to the Bag icon on mobile. Click behavior mirrors `BuyBlock`'s exactly (adds 1 unit, opens cart drawer, fires the same toast/analytics). Design spec: `docs/superpowers/specs/2026-07-04-sticky-buy-bar-design.md`; plan: `docs/superpowers/plans/2026-07-04-sticky-buy-bar.md`.
  - ⚠️ **Not yet manually verified in a browser** — code was reviewed twice (task-level + whole-branch, both approved, no Critical/Important findings) and the compiled bundle was confirmed to contain the new code, but nobody has actually scrolled/clicked it yet in this environment (no browser automation tool available here — see Local Development below). Do this before considering the feature done.

## Local Development
The app runs locally via: MongoDB in Docker (`docker run -d --name nofilterlab-mongo -p 27017:27017 mongo:7`, currently running), backend via a Python venv, frontend via yarn/craco. As of 2026-07-06 the Mongo container and both dev servers have been running continuously since 2026-07-04.

- **Backend**: `cd backend && ./.venv/Scripts/python.exe -m uvicorn server:app --host 0.0.0.0 --port 8000` — served at http://localhost:8000. Config in `backend/.env` (gitignored; not committed):
  - `MONGO_URL=mongodb://localhost:27017`, `DB_NAME=nofilterlab`, `CORS_ORIGINS=http://localhost:3000`
  - `STRIPE_API_KEY` — currently a **placeholder** (`sk_test_placeholder_replace_me`). Checkout session creation will fail with a 502 until replaced with a real Stripe test key.
  - `STRIPE_WEBHOOK_SECRET` — optional, unset. Without it the webhook endpoint accepts unsigned payloads (dev-only fallback, logs a warning each time).
  - `EMAIL_FROM_NAME` set; `RESEND_API_KEY` / `EMAIL_FROM_ADDRESS` — optional, unset. Waitlist signup works either way; welcome emails just don't send without a real key.
- **Frontend**: `cd frontend && yarn start` — served at http://localhost:3000. `frontend/.env` (gitignored) sets `REACT_APP_BACKEND_URL=http://localhost:8000`.
- **Backend tests**: `cd backend && ./.venv/Scripts/python.exe -m pytest tests/ -q` (needs `REACT_APP_BACKEND_URL`, `MONGO_URL`, `DB_NAME` env vars set, and the backend server actually running). Last full run: 18 passed, 3 failed — the 3 failures are exactly the checkout-session and welcome-email tests, which fail only because of the placeholder Stripe key / missing Resend key above, not a code regression.
- **No frontend component test framework** is installed (no `@testing-library/react`) — frontend changes are verified via ESLint (currently broken repo-wide, see Known Issues), dev-server compilation, and manual browser QA.

## Known Issues / Follow-ups
- **ESLint has no working config** — `frontend/package.json` has no `eslintConfig` field and there's no `.eslintrc*`/`eslint.config.js`, but `eslint@9.23.0` (flat-config only) is a devDependency, so `yarn eslint ...` currently fails outright with "no config found." This predates the recent changes but was only discovered while trying to lint the sticky-nav change. Needs an `eslint.config.js` before the `pre-commit-lint` hook's ESLint half (`.claude/hooks/scripts/pre_commit_lint.py`) can actually do anything for `.js`/`.jsx` files — right now it silently has nothing to check since staged JS files never fail to find files, they fail to find a config (verify before relying on it).
- **No `prettier`** in `frontend/devDependencies` — the `post-write-format` hook only formats `.py` files (via `black`) today; `.js`/`.jsx` files are left untouched on write.
- **`darkTheme` (Nav.js) now does double duty** — originally named for inverting nav colors past the hero, it's now also the sticky-purchase-bar trigger. Flagged in final review as a future-confusion risk, not a bug. Cheap fix if it ever comes up: rename to `pastHero`, derive `darkTheme` from it.
- **Product literals duplicated in 3 places** — `product_id: "the-clear-120"`, `349`, `"DKK"`, `"THE CLEAR"` appear in `Nav.js`, `BuyBlock.js`, and `CartContext.js`'s `DEFAULT_ITEM`. Fine for now (matches existing pattern, avoided introducing a new source of truth mid-change per the sticky-nav spec), but worth extracting to a shared constant before the Danish-locale work (P1 below) adds a 4th consumer.
- **`CartContext.addItem` silently no-ops past the 5-unit cap** — clicking "Add to bag" (from `BuyBlock` or the new nav CTA) when already at 5 in the cart still fires the success toast and `analytics.addToCart` event even though nothing was added. Pre-existing behavior, not introduced by the nav change; both call sites would need a fix together if this is ever addressed.
- **Nav's two buy buttons (desktop/mobile) share one `aria-label`** — harmless today since only one is ever in the accessibility tree per breakpoint (`hidden`/`md:hidden`), but worth distinguishing if `Nav.js` is revisited.

## Deferred / Backlog
- **P1: Danish locale variant** — full copy translations map + language toggle in Nav (biggest single-feature deferral).
- **P1: Embedded Stripe Payment Element** — no longer blocked by an Emergent-managed key (that constraint is gone along with the Emergent dependency); now only needs real Stripe API keys configured. Currently falls back to hosted checkout redirect after the review step, which still works fine.
- **P2: Bundle upsell** in cart drawer (3-pack save 150 DKK).
- **P2: Address autocomplete** (Danish postal API).
- ~~**P2: Real webhook verification** with Stripe signing secret~~ — **done**, conditionally: `POST /api/webhook/stripe` now verifies signatures via `stripe.Webhook.construct_event` whenever `STRIPE_WEBHOOK_SECRET` is set. It still falls back to accepting unverified payloads (with a logged warning) when that env var is absent, e.g. in local dev — set it in production.
- **P2: Order history / customer accounts.**
- **P2: Manually verify the sticky nav purchase bar** in an actual browser (see What's Been Implemented above) — 2-minute check, not yet done.
- **P3: Fix the ESLint flat-config gap** so `pre-commit-lint` can actually lint frontend changes (see Known Issues).

## Key Files
- `backend/server.py`
- `frontend/src/App.js`, `frontend/src/pages/Landing.js`, `frontend/src/pages/Checkout.js`, `frontend/src/pages/Success.js`
- `frontend/src/context/CartContext.js`
- `frontend/src/components/{Nav,CartDrawer,ScrollExperience,SplitReveal,DetailsScene,HowToUse,BuyBlock,Faq,Footer}.js`
- `frontend/src/lib/analytics.js`
- `.claude/` — project config for Claude Code (agents, commands, hooks, skills); see `.claude/skills/*/SKILL.md` for repo-specific conventions (code style, Mongo patterns, API contract, testing, planning template).
- `docs/superpowers/specs/`, `docs/superpowers/plans/` — design specs and implementation plans written via the brainstorming/writing-plans workflow.
