# Forkable Shopify-Connected Template — Design

## Problem

The site currently depends on a custom FastAPI + MongoDB + Stripe backend to sell its one product. That's a real obstacle for the stated goal: "anyone can fork this from GitHub and connect it to their OWN Shopify store easily, with zero technical knowledge." A backend means Python, a database, environment variables, and a server to host — none of which a non-technical forker can realistically set up.

## Goal

Restructure the project into a single static frontend project (`npm install && npm run dev`, no backend) that sells through the forker's own Shopify store, configured by pasting exactly 3 values into one file. Every existing visual element, layout, and animation stays pixel-identical.

## Decisions Confirmed With User

- The FastAPI/MongoDB/Stripe/Resend backend is deleted entirely — not kept alongside Shopify for anything.
- The waitlist signup feature (backend-dependent) is removed, not replaced.
- `shopify-config.js` holds 3 values, not 2: store domain, Storefront access token, and product handle (the Storefront API has no way to infer "which product" from a token alone — a single product handle is the minimum needed, and matches the app's existing single-SKU design).

## Architecture

### Project layout

Everything in `frontend/` moves up to become the repo root, so the whole project is `npm install && npm run dev` with no subfolder navigation:

```
solution/                        (repo root)
├── package.json                 (moved from frontend/, yarn → npm, adds "dev" script)
├── package-lock.json             (new, generated; yarn.lock removed)
├── craco.config.js              (moved from frontend/, +1 small addition — see below)
├── shopify-config.js            (NEW — the only file a forker edits)
├── guide.html                   (NEW — non-technical setup walkthrough)
├── README.md                    (rewritten — points to guide.html first)
├── public/                      (moved from frontend/public/, unchanged)
├── src/                         (moved from frontend/src/, unchanged except noted below)
│   ├── App.js                   (routes trimmed — /checkout and /success removed)
│   ├── pages/
│   │   └── Landing.js           (unchanged)
│   ├── components/               (all unchanged except CartDrawer.js)
│   │   └── CartDrawer.js        (checkout button rewired to Shopify, see below)
│   ├── context/CartContext.js   (unchanged — still local UI state only)
│   ├── lib/
│   │   ├── analytics.js         (unchanged)
│   │   └── shopify.js           (NEW — the only file that talks to Shopify)
│   └── constants/, hooks/       (unchanged)
├── docs/
│   └── design_guidelines.json   (moved from repo root, unchanged content)
├── memory/PRD.md                (updated to describe the new architecture)
└── .claude/                     (updated — see below)
```

Deleted outright: `backend/` (all of it), the Docker Mongo dependency and instructions, `tests/` (an empty Emergent-scaffold placeholder), `test_result.md` (Emergent's own multi-agent testing-protocol boilerplate, not used by anything here), `test_reports/` (historical logs referencing the deleted backend), `frontend/src/pages/Checkout.js`, `frontend/src/pages/Success.js`.

The waitlist UI in `BuyBlock.js` (the email signup form and its `handleWaitlist` function) is deleted; the "Or join the list" column is removed from that section's layout, and the buy column (product info, quantity selector, "Add to bag") expands to use the full width in its place — same section, same surrounding animations, one fewer column.

### Shopify integration

**`shopify-config.js`** (repo root) — a plain JS file exporting one object, written for someone who has never edited code before:

```js
// ============================================================
// SHOPIFY SETUP — paste your 3 values below, then save this file.
// Don't know where to find them? Open guide.html in your browser.
// ============================================================
const shopifyConfig = {
  // Your store's domain, exactly as Shopify shows it.
  // Example: "my-cool-shop.myshopify.com"
  storeDomain: "",

  // Your Storefront API access token (NOT your admin API key).
  // Example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
  storefrontAccessToken: "",

  // The "handle" of the product you want to sell — the part of its
  // URL after /products/. Example: if your product page is
  // my-cool-shop.myshopify.com/products/the-clear, this is "the-clear"
  productHandle: "",
};

export default shopifyConfig;
```

**`src/lib/shopify.js`** — the only file that imports `shopify-config.js` and talks to Shopify. Responsibilities:
- `isShopifyConfigured()` — returns `true` only if all 3 fields are non-empty strings.
- Lazily loads `buybutton.js` from Shopify's CDN (`https://sdks.shopifycdn.com/buy-button/latest/buybutton.js`) via a dynamic `<script>` tag the first time it's needed — not in `index.html`, so a site with no Shopify configured never loads it at all.
- `buildCheckoutUrl({ quantity })`: builds a client via `window.ShopifyBuy.buildClient({ domain, storefrontAccessToken })`, fetches the configured product via `client.product.fetchByHandle(productHandle)`, takes `product.variants[0].id` (single-variant assumption, matching this app's single-SKU design — documented as a known limit, not built to support multi-variant products), creates a checkout via `client.checkout.create()`, adds the line item via `client.checkout.addLineItems(checkout.id, [{ variantId, quantity }])`, and returns `checkout.webUrl`.

**`CartDrawer.js`** — the only existing component that changes. Today, `goCheckout` does:
```js
closeDrawer();
navigate("/checkout");
```
It becomes:
```js
const goCheckout = async () => {
  const first = items[0];
  if (!first) return;
  if (!isShopifyConfigured()) {
    toast.error("Shopify isn't connected yet.", { description: "See guide.html to connect your store." });
    return;
  }
  analytics.beginCheckout({ product_id: first.product_id, quantity: totalQuantity, total: subtotal, currency: first.currency });
  try {
    const url = await buildCheckoutUrl({ quantity: totalQuantity });
    window.location.href = url;
  } catch (e) {
    toast.error("Couldn't start checkout.", { description: e.message });
  }
};
```
Everything else in `CartDrawer.js` — the item list, quantity controls, subtotal display, "Continue browsing" — is untouched. `BuyBlock.js`'s "Add to bag" and the nav's sticky purchase-bar CTA are untouched: they only ever call `addItem()` on the local cart, which has no Shopify dependency.

`App.js` loses the `/checkout` and `/success` routes and their imports; `/` (Landing) remains the only route besides whatever 404 handling already exists (none currently — out of scope to add).

### What's explicitly preserved

Every visual component — `Nav`, `ScrollExperience`, `SplitReveal`, `DetailsScene`, `HowToUse`, `Faq`, `Footer`, the sticky nav purchase bar added this week, all Framer Motion animations, all Tailwind styling — is untouched. `BuyBlock.js` changes only by removing its waitlist column (per the confirmed decision above); its product/price/quantity/"Add to bag" UI is untouched.

### Known limitation (not a defect — inherent to this integration style)

Because payment happens on Shopify's own checkout domain, the site has no reliable way to detect "the purchase completed" afterward without Shopify Plus. This means: no `purchase` analytics event fires, and there's no custom post-purchase page — Shopify's own order-status page is what the customer sees after paying. `guide.html` should mention this so a forker doesn't expect a custom thank-you page.

### Build tooling

`package.json` (moved to repo root) keeps Create React App + Craco exactly as configured today (no rewrite to Vite or another tool — out of scope, unnecessary risk to a project whose entire point is "keep everything working exactly as it does now"). Changes:
- `"dev": "craco start"` added alongside the existing `"start"` (kept for anyone with old muscle memory) so `npm run dev` works as asked.
- Switch from `yarn` to `npm`: remove `yarn.lock` and the `packageManager` field, run `npm install` to generate `package-lock.json`.
- `craco.config.js` gets one small addition: since `shopify-config.js` lives at the repo root (outside `src/`), and Create React App's `ModuleScopePlugin` blocks imports from outside `src/` by default, `craco.config.js` needs to widen that plugin's allowed scope to include the repo root. This is a standard, well-documented craco pattern (locating the `ModuleScopePlugin` instance in `webpackConfig.resolve.plugins` and adding one path to its allowed list) — a few lines, no other webpack behavior changes.

### `.claude/` config updates

Written for the FastAPI+Mongo+Stripe backend that this change deletes; left as-is it would describe a backend that no longer exists. Updates:
- **Removed**: `.claude/skills/mongo-patterns/` (no database), `.claude/skills/api-docs/` (no backend API).
- **Updated**: `.claude/skills/code-style/` (drop the backend section, keep the frontend conventions section as-is), `.claude/skills/testing-patterns/` (drop pytest/backend content; note there's still no frontend test framework), `.claude/agents/debugger.md`, `.claude/agents/planner.md`, `.claude/agents/researcher.md`, `.claude/agents/test-runner.md`, `.claude/agents/code-reviewer.md` (all currently reference `backend/server.py`, Mongo collections, pytest — rewritten to describe the static-site-only architecture and the new `src/lib/shopify.js`).
- **Updated**: `.claude/hooks/scripts/pre_commit_lint.py` and `.claude/hooks/scripts/post_write_format.py` (both currently assume a `backend/` directory and a `backend/.venv` Python environment for linting/formatting `.py` files — neither exists after this change; the Python-specific logic is removed, keeping only the JS/ESLint half — noting the pre-existing ESLint flat-config gap documented in `memory/PRD.md` still applies).
- `.claude/hooks/block-dangerous-ops.md` and its script are unaffected (path-agnostic).

## Testing

No backend, so no backend tests. No frontend component test framework exists in this repo today (unchanged by this project) — verification is: `npm install` succeeds, `npm run dev` compiles and serves the page, the existing visual sections all render unchanged, "Add to bag" still opens the drawer with an item in it, and — with a config left empty — clicking "Check out" shows the "not connected" message instead of crashing. Actually exercising a real Shopify checkout redirect requires a real Shopify dev store, which is outside what can be verified in this environment; this is called out explicitly rather than silently skipped.

## Out of scope

- No multi-variant product support (single variant per product, matching the current single-SKU design).
- No rewrite of the build tooling (staying on Create React App/Craco).
- No screenshots generated for `guide.html` — placeholder boxes describing what each screenshot should show.
- No automatic Netlify/Vercel deployment config — `guide.html` explains the manual drag-and-drop flow, not a CI/CD pipeline.
- No changes to `memory/PRD.md`'s historical sections — only its current-state sections are updated to match.
