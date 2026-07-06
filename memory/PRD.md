# Nofilter Lab — Premium Landing Page + Full Buying Flow

## Original Problem Statement
Build the website for **Nofilter Lab**, a premium skincare brand. Product = "THE CLEAR" (120 ml leave-on exfoliant, 2% BHA + Hyaluronic Acid). The site must feel Apple-caliber premium with a cinematic, scroll-driven product reveal (iPhone 17 Pro style). Audience: 60% women / 40% men, gender-neutral. Later: add full Apple-style buying process (cart → checkout wizard → payment).

## Architecture
- **Frontend**: React 19 + Tailwind + Framer Motion + react-router-dom + sonner + PostHog (in index.html). A single root-level static project (`npm install && npm run dev`) — no backend, no `frontend/` subfolder.
- **Shopify integration (replaces the former backend)**: no backend and no database. Checkout runs through the forker's own Shopify store via the Shopify Buy SDK (loaded on demand from Shopify's CDN), wrapped entirely in `src/lib/shopify.js` and configured by the 3 values in `shopify-config.js` (store domain, Storefront access token, product handle). Cart, payment, shipping, and tax are all handled on Shopify's own hosted checkout.

## Shopify integration surface
All store integration lives in `src/lib/shopify.js`:
- `isShopifyConfigured()` — `true` only when all 3 `shopify-config.js` values are non-empty.
- `buildCheckoutUrl({ quantity })` — lazily loads the Shopify Buy SDK, fetches the configured product by handle, creates a checkout with the product's first variant (single-variant assumption, matching the single-SKU design), and returns Shopify's hosted-checkout `webUrl`. Throws with a human-readable message if the store isn't configured or the handle doesn't resolve.

There is no `/api` backend anymore — the former FastAPI/Mongo/Stripe/Resend endpoints (`/api/products`, `/api/checkout/*`, `/api/webhook/stripe`, `/api/waitlist`, etc.) were all deleted.

## Frontend routes
- `/` — Landing (scroll experience + details + how-to-use + buy block + FAQ + footer). The only route; checkout happens off-site on Shopify's hosted checkout (the old `/checkout` wizard and `/success` polling page were removed).

## Cart / Buying flow
1. **Add to Bag** on landing (or the sticky nav CTA) → slide-in cart drawer (right, glass scrim) with quantity controls (1–5). Cart is local UI state only.
2. Cart drawer **Check out** button → `buildCheckoutUrl({ quantity })` → `window.location` redirect to Shopify's hosted checkout. If `shopify-config.js` is empty, a toast ("Shopify isn't connected yet — see docs/index.html") shows instead; no crash.
3. Payment, shipping address, and tax are collected on Shopify's checkout. After paying, the customer sees Shopify's own order-status page — there is no custom `/success` page and no `purchase` analytics event (a known, inherent limit of this integration style without Shopify Plus).

## Cart persistence
- Read from `localStorage` **synchronously in useState initializer** (`nfl.cart.v1`) — no hydration race.
- Written back via `useEffect([items])`.

## Analytics events (PostHog wrapper `src/lib/analytics.js`)
- `view_hero` — landing mount.
- `view_item` — Buy block IntersectionObserver (once).
- `add_to_cart` — Add to Bag CTA.
- `begin_checkout` — Cart drawer → Check out (fired just before the Shopify redirect).
- No longer fired: `checkout_step` (the removed 3-step wizard), `sign_up` (the removed waitlist), and `purchase` (payment now completes on Shopify's domain, which this integration style can't observe without Shopify Plus). The wrapper functions may still exist in `analytics.js` but nothing calls these three anymore.

## Test Reports
Historical only — the `test_reports/` directory and the `backend/tests/` suites it recorded were deleted with the backend. Prior results (2025-12, iterations 1–3) covered the FastAPI backend and the old checkout flow that no longer exist. There is no automated test suite today.

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

## What's Been Implemented (2026-07-06 — Shopify template conversion)
Converted the project into a forkable, backend-free Shopify-connected template. Design spec: `docs/superpowers/specs/2026-07-06-shopify-forkable-template-design.md`; plan: `docs/superpowers/plans/2026-07-06-shopify-forkable-template.md`.
- **Single root-level static project**: moved everything from `frontend/*` up to the repo root, so the whole app is `npm install && npm run dev` (added a `dev` script) with no subfolder. Switched from yarn to npm (a scoped `schema-utils` override in `package.json` + `.npmrc` `legacy-peer-deps=true` resolve two real npm-vs-yarn resolution differences in this tree). Build config that the app needs — `tailwind.config.js`, `postcss.config.js`, `jsconfig.json`, `components.json`, `plugins/health-check/` — moved to the root alongside `craco.config.js`.
- **Backend removed entirely**: deleted `backend/` (FastAPI + Motor/Mongo + Stripe + Resend), the Docker Mongo dependency, and the stale Emergent-era `tests/`, `test_result.md`, and `test_reports/`.
- **Shopify Buy SDK integration**: added `shopify-config.js` (the one file a forker edits — 3 values) and `src/lib/shopify.js` (`isShopifyConfigured()` + `buildCheckoutUrl()`), wired into `CartDrawer.js`'s Check out button (redirects to Shopify's hosted checkout, or toasts if unconfigured). `craco.config.js` widens CRA's `ModuleScopePlugin` so the root `shopify-config.js` can be imported from `src/`.
- **Removed the old checkout stack**: deleted `/checkout` and `/success` routes + `src/pages/Checkout.js`/`Success.js`, and removed the backend-dependent waitlist signup from `BuyBlock.js` (its buy column now spans full width).
- **Docs for forkers**: the setup guide `docs/index.html` (plain-language 6-step setup: fork → free Shopify store → Storefront API → paste 3 values → preview → publish via Netlify/Vercel drag-and-drop) and a rewritten `README.md` pointing to it. Served at the repo's GitHub Pages URL (Pages source: `main` → `/docs`).
- **`.claude/` config** updated to describe the backend-free architecture (removed `mongo-patterns`/`api-docs` skills and `seed-data` command; rewrote agents, remaining commands, code-style, testing-patterns, hooks).
- ⚠️ **Not yet manually verified in a browser** (no browser automation available here). `npm install`, `npm run build`, and `npm run dev` (HTTP 200 on :3000) were all confirmed; the click-through (Add to bag → drawer → Check out toast with empty config) and a real Shopify checkout redirect against a live dev store still need a manual pass.

## Local Development
The app is a single static frontend — no backend, no database, no Docker. From the repo root:

- `npm install` — installs dependencies (generates/uses `package-lock.json`; `.npmrc` sets `legacy-peer-deps=true`).
- `npm run dev` (alias of `npm run start`, i.e. `craco start`) — served at http://localhost:3000.
- `npm run build` — production build into `build/` (deploy that folder to any static host; `docs/index.html` documents the Netlify/Vercel drag-and-drop flow for forkers).
- **Shopify config**: `shopify-config.js` at the repo root holds the 3 values (store domain, Storefront access token, product handle). It's committed with real values once configured — Shopify Storefront tokens are public/client-safe by design, so it is intentionally **not** gitignored. With it left empty, the site runs fine but Check out shows a "not connected" toast instead of redirecting.
- **No automated test framework** (no backend to test, and `@testing-library/react` is not installed) — changes are verified via `npm run build`/`npm run dev` compiling cleanly, ESLint (see Known Issues re: config gap), and manual browser QA.

## Known Issues / Follow-ups
- **ESLint has no working config** — root `package.json` has no `eslintConfig` field and there's no `.eslintrc*`/`eslint.config.js`, but `eslint@9.23.0` (flat-config only) is a devDependency, so `npx eslint ...` currently fails outright with "no config found." Needs an `eslint.config.js` before the `pre-commit-lint` hook's ESLint half (`.claude/hooks/scripts/pre_commit_lint.py`, which now runs `npx eslint` on staged `src/*.js(x)`) can actually do anything (verify before relying on it). Note: `craco start`/`craco build` still lint via CRA's own built-in eslint-loader config, which is separate and works — this gap is only about the standalone `npx eslint` invocation the hook uses.
- **No `prettier`** in the project's devDependencies — the `post-write-format` hook only formats `.py` files (via `black`, if installed) today; `.js`/`.jsx` files are left untouched on write.
- **`darkTheme` (Nav.js) now does double duty** — originally named for inverting nav colors past the hero, it's now also the sticky-purchase-bar trigger. Flagged in final review as a future-confusion risk, not a bug. Cheap fix if it ever comes up: rename to `pastHero`, derive `darkTheme` from it.
- **Product literals duplicated in 3 places** — `product_id: "the-clear-120"`, `349`, `"DKK"`, `"THE CLEAR"` appear in `Nav.js`, `BuyBlock.js`, and `CartContext.js`'s `DEFAULT_ITEM`. Fine for now (matches existing pattern, avoided introducing a new source of truth mid-change per the sticky-nav spec), but worth extracting to a shared constant before the Danish-locale work (P1 below) adds a 4th consumer.
- **`CartContext.addItem` silently no-ops past the 5-unit cap** — clicking "Add to bag" (from `BuyBlock` or the new nav CTA) when already at 5 in the cart still fires the success toast and `analytics.addToCart` event even though nothing was added. Pre-existing behavior, not introduced by the nav change; both call sites would need a fix together if this is ever addressed.
- **Nav's two buy buttons (desktop/mobile) share one `aria-label`** — harmless today since only one is ever in the accessibility tree per breakpoint (`hidden`/`md:hidden`), but worth distinguishing if `Nav.js` is revisited.

Several former backlog items are now obsolete because the backend they depended on is gone: Embedded Stripe Payment Element, Stripe webhook verification, order history / customer accounts, and Danish address autocomplete (Shopify's own checkout collects the address now). Removed.

- **P1: Danish locale variant** — full copy translations map + language toggle in Nav (biggest single-feature deferral). Still applies to the static frontend.
- **P2: Bundle upsell** in cart drawer (3-pack save 150 DKK).
- **P2: Manually verify in a browser** — both the sticky nav purchase bar (from the prior change) and the new Shopify checkout flow (Add to bag → drawer → Check out; and a real redirect against a live Shopify dev store).
- **P3: Fix the ESLint flat-config gap** so `pre-commit-lint`'s `npx eslint` can actually lint `src/` changes (see Known Issues).
- **Out of scope (per the 2026-07-06 conversion's Global Constraints):** multi-variant product support — the Shopify integration assumes a single variant per product, matching the single-SKU design.

## Key Files
- `shopify-config.js` — the one file a forker edits (3 Shopify values). At the repo root.
- `src/lib/shopify.js` — the only file that talks to Shopify (Buy SDK wrapper).
- `src/App.js`, `src/pages/Landing.js` (the only page/route left).
- `src/context/CartContext.js` — local cart UI state (localStorage, no backend).
- `src/components/{Nav,CartDrawer,ScrollExperience,SplitReveal,DetailsScene,HowToUse,BuyBlock,Faq,Footer}.js`
- `src/lib/analytics.js`
- `docs/index.html`, `README.md` — non-technical setup walkthrough (also served via GitHub Pages) + quick reference.
- `craco.config.js`, `tailwind.config.js`, `postcss.config.js`, `jsconfig.json`, `components.json` — build/tooling config (at the repo root).
- `.claude/` — project config for Claude Code (agents, commands, hooks, skills); see `.claude/skills/*/SKILL.md` for repo-specific conventions (code style, testing notes, planning template).
- `docs/superpowers/specs/`, `docs/superpowers/plans/` — design specs and implementation plans written via the brainstorming/writing-plans workflow.
