# Sticky Purchase Bar in Nav — Design

## Problem
The only "Add to bag" control on the site lives inside `BuyBlock`, which sits after the full cinematic scroll experience (`ScrollExperience`), `DetailsScene`, and `HowToUse`. A visitor has to scroll through the entire hero sequence before finding a way to buy. The `Nav` bar (always fixed/visible) currently only exposes a "Bag" icon, which opens an empty cart drawer until something has already been added.

## Goal
Make buying possible from anywhere on the page, without disrupting the cinematic hero moment at the top.

## Approach
Extend the existing `frontend/src/components/Nav.js` rather than adding a new component. `Nav` already tracks scroll position via a `darkTheme` boolean (flips to `true` once `window.scrollY > window.innerHeight * 1.2`, i.e. once the visitor has scrolled past the hero). Reuse that same flag as the trigger for the purchase bar — no new scroll listener, no new state.

## Behavior

**Trigger**: purchase bar is hidden while `darkTheme === false` (during/before the hero). Once `darkTheme === true`, it fades in and stays visible for the remainder of the page, including when scrolling back up past that threshold (it hides again, matching the existing `darkTheme` toggle behavior symmetrically).

**Desktop (`md:` and up)**:
- While not triggered: nav shows logo, center nav links (The Clear / Ingredients / Results / Details / FAQ), and the Bag icon — unchanged from today.
- Once triggered: the center nav links are replaced by "THE CLEAR — 349 DKK" text plus an "Add to bag" pill button, positioned to the left of the existing Bag icon. Nav links remain reachable via scrolling back up past the trigger point; they are not removed from the page, only swapped out of the nav while the purchase bar is active.

**Mobile**: nav links are already hidden below `md:`, so nothing is removed. Once triggered, a compact "Buy" button appears next to the existing Bag icon (icon + short label, sized like the current Bag button).

**Click behavior**: identical to `BuyBlock`'s existing `handleAddToBag` — calls `addItem({ quantity: 1 })` from `CartContext`, opens the cart drawer via `openDrawer()`, shows a `sonner` toast ("Added to bag."), and fires `analytics.addToCart({ product_id: "the-clear-120", quantity: 1, subtotal: 349, currency: "DKK" })`. No new checkout logic; no changes to `CartContext`, the cart drawer, or the backend.

**Price source**: the `349` DKK price is currently hardcoded in `BuyBlock.js` for the toast/analytics call (not fetched from `/api/products/the-clear-120`). The new nav button follows the same existing pattern for consistency — not introducing a new source of truth in this change.

## Testing
- New `data-testid="nav-buy-cta"` on the button, following the existing testId convention (`frontend/src/constants/testIds/`).
- Manual verification: scroll past hero on desktop and mobile viewport widths, confirm the bar appears/disappears at the right scroll position, confirm clicking adds to bag and opens the drawer with the correct toast and cart state.
- No backend changes — no backend test coverage needed.

## Out of scope
- No changes to `BuyBlock`, `CartContext`, cart drawer, or backend endpoints.
- No quantity selector in the nav CTA (fixed at 1, matching the "one-click" behavior chosen).
- No changes to the hero/cinematic scroll experience itself.
