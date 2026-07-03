# Nofilter Lab — Premium Landing Page

## Original Problem Statement
Build the website for **Nofilter Lab**, a premium skincare brand. Product = "THE CLEAR" (120 ml leave-on exfoliant, 2% BHA + Hyaluronic Acid). The site must feel Apple-caliber premium with a cinematic, scroll-driven product reveal (iPhone 17 Pro style). Copy is direct, no jargon. Audience: 60% women / 40% men, gender-neutral.

## User Choices (confirmed)
- **Language**: English only
- **Scope**: Single premium landing page (Hero + scroll-driven product reveal + ingredients + results + how-to-use + FAQ + footer). No backend / no checkout.
- **Aesthetic**: Hero starts light cream (#F2EEE8), transitions to deep ink (#1F1F1F) as user scrolls.
- **Product visuals**: Single provided bottle photo with cinematic transforms (scale/parallax/rotation/blur).
- **Tone**: Simple, direct, no marketing buzzwords — English adapting Danish source.

## Architecture
- **Frontend**: React 19 + Tailwind + Framer Motion (`useScroll` + `useTransform` for scroll-linked animations).
- **Backend**: Not used for this MVP (static marketing page).
- **Assets**: Product PNG (background removed via rembg), SVG logos in `/app/frontend/public/assets/`.
- **Typography**: Manrope (display), Courier Prime (mono/data), per brand book.
- **Colors**: `#F2EEE8` cream, `#1F1F1F` ink, `#9AA6B2` accent (used sparingly).

## Scroll Cinematic (620vh pinned experience)
1. **Hero** — Big tagline "Clear skin. / Fewer choices." with bottle rising through the type.
2. **Statement** — Background cross-fades cream → ink; "Skincare shouldn't be this complicated."
3. **Ingredients** — Bottle pinned left; 2% BHA + Hyaluronic Acid reveal with staggered fades.
4. **Results** — Bottle drifts right + subtle blur; 94% / 91% / 88% metrics reveal.
5. **Outro** — Product fades out; scroll releases into How-to-use + FAQ + Footer sections.

## What's Been Implemented (2025-12)
- Full scroll-driven hero → product reveal with sticky viewport
- Cream ↔ ink background transition tied to scroll progress
- 3-step How to Use section, 6-question minimalist FAQ accordion, editorial footer
- Fixed nav that adapts logo colour to background theme
- Fully responsive (mobile stacks with ingredient callouts under bottle)
- All interactive elements have `data-testid`
- Background removed from product PNG using rembg (CPU)

## Deferred / Backlog
- P1: Notify-me email capture (needs backend + MongoDB)
- P1: Cart + Stripe checkout
- P1: Additional product angles (would improve rotate/reveal fidelity)
- P2: Video hero variant, motion-reduce fallback illustrations
- P2: Multi-language (Danish variant matching the brand's home market)

## Key Files
- `/app/frontend/src/App.js` — page composition
- `/app/frontend/src/components/Nav.js` — theme-aware nav
- `/app/frontend/src/components/ScrollExperience.js` — the cinematic sticky sequence
- `/app/frontend/src/components/HowToUse.js` — 3-step usage
- `/app/frontend/src/components/Faq.js` — accordion
- `/app/frontend/src/components/Footer.js` — closing statement + meta
