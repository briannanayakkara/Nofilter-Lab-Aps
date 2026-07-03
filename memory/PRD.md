# Nofilter Lab — Premium Landing Page

## Original Problem Statement
Build the website for **Nofilter Lab**, a premium skincare brand. Product = "THE CLEAR" (120 ml leave-on exfoliant, 2% BHA + Hyaluronic Acid). The site must feel Apple-caliber premium with a cinematic, scroll-driven product reveal (iPhone 17 Pro style). Copy is direct, no jargon. Audience: 60% women / 40% men, gender-neutral.

## User Choices (confirmed)
- English only.
- Hero starts cream (#F2EEE8), transitions to ink (#1F1F1F).
- Product: THE CLEAR — **349 DKK** (120 ml).
- Real Stripe hosted checkout (test mode).
- Waitlist confirmation on page + real welcome email via Emergent-managed Resend.
- Multi-angle bottle rotation across scroll + dedicated "See the details" back-label scene.
- All Apple-caliber animations enabled.

## Architecture
- **Frontend**: React 19 + Tailwind + Framer Motion (`useScroll`, `useTransform`, `useSpring`) + react-router-dom + sonner.
- **Backend**: FastAPI + Motor (Mongo) + httpx + `emergentintegrations` (Stripe checkout).
- **Assets**: 4 transparent bottle PNGs (rembg processed) in `/app/frontend/public/assets/` + `/angles/`.
- **Typography**: Manrope (display), Courier Prime (mono/data).
- **Colors**: `#F2EEE8` cream, `#1F1F1F` ink, `#9AA6B2` accent.

## Backend Endpoints
- `GET  /api/products/{id}` — returns product catalog (backend-defined pricing, never trust client).
- `POST /api/waitlist` — validates email, dedupes in Mongo, fires welcome email via Emergent Resend proxy.
- `GET  /api/waitlist/count` — public count.
- `POST /api/checkout/session` — creates real Stripe checkout session (DKK 349), stores payment_transactions row.
- `GET  /api/checkout/status/{session_id}` — polls Stripe, updates Mongo, idempotent for `paid`.
- `POST /api/webhook/stripe` — Stripe webhook receiver.

## Scroll Cinematic (700vh pinned experience)
1. **Hero** — word-level split-reveal "Clear skin. / Fewer choices." with bottle rising through.
2. **Statement** — cross-fade cream → ink.
3. **Ingredients** — bottle drifts left, callouts with BHA + HA micro-icons (SVG path draw + circle scale).
4. **Results** — bottle drifts right + micro-blur; 94/91/88 with horizontal metric-row drift.

Post-cinematic sections (ink):
5. **See the details** — magnified back-label bottle with loupe spotlight; 4 sequential callouts fade in.
6. **How to Use** — 3 steps.
7. **Buy Block** — 349 DKK price, Add-to-Bag → Stripe, waitlist form with sonner toast.
8. **FAQ** — accordion.
9. **Footer** — closing "Less. Done well." + meta.

## What's Been Implemented (2025-12)
### Iteration 1 (initial MVP)
- Hero → product reveal, all scroll scenes, HowToUse, FAQ, Footer.

### Iteration 2 (this)
- Multi-angle bottle cross-fade (front → tilt → 45° → back) synced to scroll.
- Word-level split-reveal on hero title.
- Ingredient micro-animations (SVG droplet path draw + HA circle scale).
- Horizontal metric-row drift on results.
- Fluid morphing gradient behind dark scenes.
- New "See the details" section with pinned bottle + loupe + fading callouts.
- Waitlist form (Mongo store + Resend welcome email) with sonner toast.
- Add-to-Bag → real Stripe checkout (test mode, 349 DKK).
- /success page with checkout status polling (up to 5 attempts, 2s intervals).

## Test Reports
- `/app/test_reports/iteration_1.json` — 9/9 frontend passed.
- `/app/test_reports/iteration_2.json` — 10/10 backend + 6/6 frontend passed (100%).

## Deferred / Backlog
- P2: Rate-limit /api/waitlist (IP throttling).
- P2: Move `<Toaster />` to the root layout so it's always mounted.
- P2: Danish locale variant.
- P2: Analytics events (view_item, add_to_cart, sign_up).
- P2: Product bundle / subscription option.

## Key Files
- `/app/backend/server.py`
- `/app/frontend/src/App.js`, `/pages/Landing.js`, `/pages/Success.js`
- `/app/frontend/src/components/Nav.js`, `/ScrollExperience.js`, `/SplitReveal.js`, `/DetailsScene.js`, `/HowToUse.js`, `/BuyBlock.js`, `/Faq.js`, `/Footer.js`
