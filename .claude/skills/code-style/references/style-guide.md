# Style Guide

Derived from the current codebase — update this file when the repo's actual conventions change, don't let it drift into aspirational rules nobody follows.

## Frontend (`src/`, React 19 + Tailwind + Craco)

- **Function components + hooks only** — no class components.
- **Cart state**: all of it goes through `context/CartContext.js`'s `useCart()`. Never read/write the `nfl.cart.v1` localStorage key directly from a component.
- **Cart init is synchronous**: `useState(readCart)` (function form), not `useState([])` + `useEffect` — this avoids a hydration race. Follow this pattern for any other localStorage-backed state.
- **Analytics**: all PostHog events go through `lib/analytics.js`'s wrapper functions, never `posthog.capture(...)` called directly from a component.
- **Shopify**: all Shopify Buy SDK access goes through `lib/shopify.js` — never call `window.ShopifyBuy` directly from a component. Check `isShopifyConfigured()` before any flow that requires a real store connection.
- **Styling**: Tailwind utility classes directly in JSX; `class-variance-authority` + `clsx`/`tailwind-merge` for variant components (see `components/ui/`), not separate CSS files.
- **File naming**: PascalCase for components (`BuyBlock.js`), matching the component name exported.
