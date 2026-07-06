# Forkable Shopify-Connected Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Nofilter Lab site into a single static frontend project (`npm install && npm run dev`, no backend) that sells through a forker's own Shopify store, configured by pasting 3 values into one file — with every existing visual element and animation untouched.

**Architecture:** Move `frontend/*` up to the repo root, delete the FastAPI/Mongo/Stripe backend entirely, add a thin Shopify Buy SDK client wrapper (`src/lib/shopify.js`) consumed only by `CartDrawer.js`'s checkout button, delete the old `/checkout` and `/success` routes (Shopify's own hosted checkout replaces them), and write `guide.html` + `README.md` for non-technical forkers.

**Tech Stack:** React 19 + Tailwind + Framer Motion + Craco (unchanged), Shopify Buy SDK (`buybutton.js` from Shopify's CDN, client-only usage — not the pre-styled UI components), npm (switched from yarn).

## Global Constraints

- Every existing visual component, layout, and animation (`Nav`, `ScrollExperience`, `SplitReveal`, `DetailsScene`, `HowToUse`, `Faq`, `Footer`, the sticky nav purchase bar) stays untouched — no design changes anywhere in this plan except removing `BuyBlock.js`'s waitlist column (confirmed with user) and the checkout redirect in `CartDrawer.js`.
- No backend, no environment variables, no command-line beyond `npm install` / `npm run dev` — confirmed with user: the FastAPI/Mongo/Stripe/Resend backend is deleted entirely, not kept alongside Shopify.
- The waitlist signup feature is removed, not replaced (confirmed with user).
- `shopify-config.js` holds exactly 3 values: `storeDomain`, `storefrontAccessToken`, `productHandle` (confirmed with user — a Storefront token alone can't identify which product to sell).
- Single variant per product — no multi-variant support (matches the app's existing single-SKU design, documented as a known limit).
- `shopify-config.js` is meant to be committed with real values once a forker configures it — Shopify Storefront access tokens are public/client-safe by design (unlike Admin API keys), so this is not a leaked-secret situation. Do not gitignore it.

---

### Task 1: Restructure to a single root-level static frontend

**Files:**
- Move: `frontend/package.json` → `package.json`, `frontend/craco.config.js` → `craco.config.js`, `frontend/public/` → `public/`, `frontend/src/` → `src/`, `frontend/.env` → `.env`
- Move: `design_guidelines.json` → `docs/design_guidelines.json`
- Create: `.npmrc`
- Delete: `backend/`, `tests/`, `test_result.md`, `test_reports/`, `frontend/` (once empty), `frontend/yarn.lock`
- Modify: `package.json` (post-move, at its new root location)

**Interfaces:**
- Produces: the repo root becomes the npm project root. All later tasks reference `src/...` paths (not `frontend/src/...`), and `package.json` at the repo root with a `"dev"` script. `craco.config.js` at the repo root is what Task 2 edits next.

- [ ] **Step 1: Stop any running dev processes tied to the old layout**

The current session may have a backend (uvicorn on port 8000), a frontend dev server (craco on port 3000), and a Docker MongoDB container running from earlier work. All three are being deleted or relocated in this task, so stop them first:

```bash
# Stop anything listening on 3000/8000 (Windows)
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000,8000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
# Stop and remove the Mongo container (no longer needed at all — Shopify is the only data store now)
docker stop nofilterlab-mongo 2>/dev/null
docker rm nofilterlab-mongo 2>/dev/null
```

Expected: no errors (or a harmless "no such container" if it was already stopped).

- [ ] **Step 2: Move the frontend's tracked files to the repo root**

Run from the repo root:

```bash
git mv frontend/package.json package.json
git mv frontend/craco.config.js craco.config.js
git mv frontend/public public
git mv frontend/src src
git mv design_guidelines.json docs/design_guidelines.json
```

Expected: each command prints nothing on success (git mv is silent). Verify with `git status --short` — you should see renames (`R`) for each, not separate add/delete pairs.

- [ ] **Step 3: Move the untracked `.env` file (plain `mv`, not `git mv` — it's gitignored)**

```bash
mv frontend/.env .env
```

If `frontend/.env` doesn't exist (e.g. a fresh clone with no local dev setup yet), skip this step — there's nothing to move.

- [ ] **Step 4: Delete the old `frontend/` directory (its remaining contents — `node_modules/`, `yarn.lock` — are either gitignored or being replaced)**

```bash
rm -rf frontend/
```

- [ ] **Step 5: Delete the backend and stale Emergent-era test artifacts**

```bash
git rm -r backend/
git rm -r tests/
git rm test_result.md
git rm -r test_reports/
```

Expected: each prints a list of removed files. `backend/.venv`, `backend/__pycache__`, `backend/.pytest_cache` are gitignored and untracked — `git rm -r backend/` won't touch them as git operations, but since the whole `backend/` directory is being removed from disk too, follow with:

```bash
rm -rf backend/
```

(This is safe to run even though `git rm -r backend/` already removed the tracked files — it just clears out the gitignored leftovers in the same directory.)

- [ ] **Step 6: Convert `package.json` from yarn to npm, at its new root location**

Read the current `package.json` (now at the repo root after Step 2) and replace its `"scripts"` and `"resolutions"`/`"packageManager"` handling as follows. The `"dependencies"`, `"browserslist"`, and `"devDependencies"` blocks are unchanged — only `"scripts"` gains a `"dev"` entry, and `"resolutions"` + `"packageManager"` are replaced by a single targeted `"overrides"` entry (verified empirically — see rationale below).

Replace the file's `"scripts"` block:

```json
  "scripts": {
    "start": "craco start",
    "build": "craco build",
    "test": "craco test"
  },
```

with:

```json
  "scripts": {
    "start": "craco start",
    "dev": "craco start",
    "build": "craco build",
    "test": "craco test"
  },
```

Replace the file's `"resolutions"` block and the trailing `"packageManager"` field (i.e. everything from `"resolutions": {` through the `"packageManager": "yarn@..."` line) with a single `"overrides"` block:

```json
  "overrides": {
    "@pmmmwh/react-refresh-webpack-plugin": {
      "schema-utils": "3.3.0"
    }
  }
```

Rationale (so you don't second-guess this and try to port the full yarn `resolutions` list to npm's different `overrides` syntax): a plain `npm install` on this dependency tree fails outright two ways, both verified directly:
1. A peer-dependency conflict (`date-fns@4.1.0` vs `react-day-picker`'s peer range) — fixed by `.npmrc` in Step 7, not by anything in `package.json`.
2. `ajv-keywords@5.1.0` (pulled in by `@pmmmwh/react-refresh-webpack-plugin`'s `schema-utils@4.3.3`) needs `ajv@^8`, but npm hoists a top-level `ajv@6.15.0` (needed by three *other* dependency chains that all use `ajv-keywords@3.5.2`) and `ajv-keywords@5.1.0` incorrectly resolves to that wrong top-level `ajv@6`, crashing the build with `Cannot find module 'ajv/dist/compile/codegen'`. The single scoped override above downgrades `schema-utils` for that one specific chain to `3.3.0` (which uses `ajv-keywords@3.5.2`/`ajv@6`, matching everything else) — eliminating the version clash entirely rather than trying to force one ajv version on every consumer (which breaks a *different* consumer, `fork-ts-checker-webpack-plugin`, if you try it — also verified directly). The original yarn `resolutions` list is dropped, not translated — yarn and npm resolve dependencies differently enough that a blind syntax port isn't reliable, and this specific tree was empirically confirmed to install and build correctly under npm without the rest of that list.

- [ ] **Step 7: Add `.npmrc` at the repo root**

```
legacy-peer-deps=true
```

This fixes the `date-fns`/`react-day-picker` peer-dependency conflict mentioned above (a real, pre-existing version mismatch — `react-day-picker@8.10.1` peer-requires `date-fns@^2.28.0 || ^3.0.0` but the project uses `date-fns@4.1.0`; yarn is lenient about this by default, npm is strict). This flag doesn't disable any check that would otherwise catch a real bug in this project's own code — it only relaxes npm's peer-dependency strictness to match yarn's existing (already-working) behavior.

- [ ] **Step 8: Install and verify**

```bash
npm install
```

Expected: completes with an `added N packages` summary (some deprecation warnings are expected and pre-existing — e.g. `rimraf`, `glob`, `eslint@8` — not something to fix here). No `ERESOLVE` or `MODULE_NOT_FOUND` errors.

```bash
npm run build
```

Expected: ends with `Compiled successfully.` and a `File sizes after gzip` summary. If it fails, do not guess at further overrides — stop and report `BLOCKED` with the exact error; the two known failure modes for this tree are already fixed by Steps 6–7.

```bash
npm run dev
```

Expected (in a separate terminal or backgrounded): `Compiled successfully!` and `Local: http://localhost:3000`. Confirm with `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000` → `200`. Stop the dev server after confirming (`Ctrl+C`, or on Windows: find the PID via `Get-NetTCPConnection -LocalPort 3000` and `Stop-Process`).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Restructure to a single root-level static frontend, remove backend

Moves frontend/* to the repo root so the project runs as a plain
npm install / npm run dev static site. Deletes the FastAPI/Mongo/Stripe
backend, the Docker Mongo dependency, and stale Emergent-era test
artifacts (tests/, test_result.md, test_reports/) entirely — this repo
no longer has or needs a backend. Switches from yarn to npm (verified
working: a scoped schema-utils override plus legacy-peer-deps resolves
two real npm-vs-yarn dependency resolution differences in this tree).
EOF
)"
```

---

### Task 2: Shopify config file and client library

**Files:**
- Create: `shopify-config.js` (repo root)
- Create: `src/lib/shopify.js`
- Modify: `craco.config.js:82-102` (the `webpack.configure` function)

**Interfaces:**
- Consumes: nothing from earlier tasks beyond the new repo layout from Task 1.
- Produces: `isShopifyConfigured(): boolean` and `buildCheckoutUrl({ quantity: number }): Promise<string>` (resolves to a Shopify-hosted checkout URL, or throws an `Error` with a human-readable `.message`) from `src/lib/shopify.js` — Task 3 imports both of these into `CartDrawer.js`.

- [ ] **Step 1: Create `shopify-config.js` at the repo root**

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

- [ ] **Step 2: Create `src/lib/shopify.js`**

```js
import shopifyConfig from "../../shopify-config";

const BUY_BUTTON_SCRIPT_URL = "https://sdks.shopifycdn.com/buy-button/latest/buybutton.js";

let scriptLoadPromise = null;

const loadShopifyScript = () => {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.ShopifyBuy) return Promise.resolve(window.ShopifyBuy);
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = BUY_BUTTON_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (window.ShopifyBuy) resolve(window.ShopifyBuy);
      else reject(new Error("Shopify Buy SDK failed to load"));
    };
    script.onerror = () => reject(new Error("Could not load the Shopify Buy SDK script"));
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
};

export const isShopifyConfigured = () => {
  const { storeDomain, storefrontAccessToken, productHandle } = shopifyConfig;
  return Boolean(storeDomain && storefrontAccessToken && productHandle);
};

let clientPromise = null;

const getClient = async () => {
  if (clientPromise) return clientPromise;
  clientPromise = loadShopifyScript().then((ShopifyBuy) =>
    ShopifyBuy.buildClient({
      domain: shopifyConfig.storeDomain,
      storefrontAccessToken: shopifyConfig.storefrontAccessToken,
    })
  );
  return clientPromise;
};

export const buildCheckoutUrl = async ({ quantity }) => {
  if (!isShopifyConfigured()) {
    throw new Error("Shopify isn't connected yet — see guide.html");
  }
  const client = await getClient();
  const product = await client.product.fetchByHandle(shopifyConfig.productHandle);
  if (!product || !product.variants || product.variants.length === 0) {
    throw new Error(`No product found for handle "${shopifyConfig.productHandle}"`);
  }
  const variantId = product.variants[0].id;
  const checkout = await client.checkout.create();
  const updated = await client.checkout.addLineItems(checkout.id, [
    { variantId, quantity },
  ]);
  return updated.webUrl;
};
```

- [ ] **Step 3: Allow importing `shopify-config.js` from outside `src/` in `craco.config.js`**

Create React App's `ModuleScopePlugin` blocks imports from outside `src/` by default, which would otherwise break the `import shopifyConfig from "../../shopify-config"` line above with a build error ("You attempted to import ../../shopify-config which falls outside of the project src/ directory"). In `craco.config.js`, find this block (inside the `webpack.configure` function):

```js
      // Add health check plugin to webpack if enabled
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }
      return webpackConfig;
```

Replace it with:

```js
      // Add health check plugin to webpack if enabled
      if (config.enableHealthCheck && healthPluginInstance) {
        webpackConfig.plugins.push(healthPluginInstance);
      }

      // Allow importing shopify-config.js from the repo root (outside src/) —
      // CRA's ModuleScopePlugin blocks cross-boundary imports by default.
      const ModuleScopePlugin = require("react-dev-utils/ModuleScopePlugin");
      const scopePluginIndex = webpackConfig.resolve.plugins.findIndex(
        (plugin) => plugin instanceof ModuleScopePlugin
      );
      if (scopePluginIndex > -1) {
        webpackConfig.resolve.plugins[scopePluginIndex].appSrcs.push(
          path.resolve(__dirname)
        );
      }

      return webpackConfig;
```

This has been verified directly: a test file importing `shopify-config.js` this exact way compiled successfully with this exact patch (and failed with the expected "falls outside of the project src/ directory" error without it).

- [ ] **Step 4: Verify it compiles**

```bash
npm run build
```

Expected: `Compiled successfully.` — this confirms both new files parse correctly and the cross-boundary import works. (`src/lib/shopify.js` isn't imported by anything yet, so this only checks that it's syntactically valid and that the config import resolves — Task 3 wires it into actual UI.)

- [ ] **Step 5: Commit**

```bash
git add shopify-config.js src/lib/shopify.js craco.config.js
git commit -m "$(cat <<'EOF'
Add Shopify config file and client library

shopify-config.js is the single file a forker edits (store domain,
Storefront token, product handle). src/lib/shopify.js wraps the
Shopify Buy SDK (loaded from Shopify's CDN, client-only — not the
pre-styled UI components) to build a hosted-checkout URL for a given
quantity. Not wired into any component yet (next task).
EOF
)"
```

---

### Task 3: Wire checkout to Shopify, remove the old checkout/success pages

**Files:**
- Modify: `src/components/CartDrawer.js`
- Modify: `src/App.js`
- Delete: `src/pages/Checkout.js`, `src/pages/Success.js`

**Interfaces:**
- Consumes: `isShopifyConfigured()` and `buildCheckoutUrl({ quantity })` from `src/lib/shopify.js` (Task 2).
- Produces: nothing new consumed by later tasks.

- [ ] **Step 1: Rewrite `CartDrawer.js`'s imports and `goCheckout`**

Replace:

```js
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { analytics } from "../lib/analytics";

const EASE = [0.16, 1, 0.3, 1];

const CartDrawer = () => {
  const {
    items,
    subtotal,
    setQuantity,
    removeItem,
    drawerOpen,
    closeDrawer,
    totalQuantity,
  } = useCart();
  const navigate = useNavigate();

  const goCheckout = () => {
    const first = items[0];
    if (!first) return;
    analytics.beginCheckout({
      product_id: first.product_id,
      quantity: totalQuantity,
      total: subtotal,
      currency: first.currency,
    });
    closeDrawer();
    navigate("/checkout");
  };
```

with:

```js
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "../context/CartContext";
import { analytics } from "../lib/analytics";
import { buildCheckoutUrl, isShopifyConfigured } from "../lib/shopify";

const EASE = [0.16, 1, 0.3, 1];

const CartDrawer = () => {
  const {
    items,
    subtotal,
    setQuantity,
    removeItem,
    drawerOpen,
    closeDrawer,
    totalQuantity,
  } = useCart();
  const [checkingOut, setCheckingOut] = useState(false);

  const goCheckout = async () => {
    const first = items[0];
    if (!first) return;

    if (!isShopifyConfigured()) {
      toast.error("Shopify isn't connected yet.", {
        description: "See guide.html to connect your store.",
      });
      return;
    }

    analytics.beginCheckout({
      product_id: first.product_id,
      quantity: totalQuantity,
      total: subtotal,
      currency: first.currency,
    });

    setCheckingOut(true);
    try {
      const url = await buildCheckoutUrl({ quantity: totalQuantity });
      window.location.href = url;
    } catch (e) {
      toast.error("Couldn't start checkout.", { description: e.message });
      setCheckingOut(false);
    }
  };
```

- [ ] **Step 2: Give the "Check out" button a loading state**

The checkout action is now an async Shopify API call instead of an instant local `navigate()`, so it needs visible feedback while it's in flight. Replace:

```jsx
                <button
                  type="button"
                  onClick={goCheckout}
                  data-testid="cart-checkout-cta"
                  className="w-full inline-flex items-center justify-center gap-4 bg-[#1F1F1F] text-[#F2EEE8] px-8 py-5 hover:bg-black transition-colors duration-500 group"
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.3em]">Check out</span>
                  <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-2" strokeWidth={1.25} />
                </button>
```

with:

```jsx
                <button
                  type="button"
                  onClick={goCheckout}
                  disabled={checkingOut}
                  data-testid="cart-checkout-cta"
                  className="w-full inline-flex items-center justify-center gap-4 bg-[#1F1F1F] text-[#F2EEE8] px-8 py-5 hover:bg-black transition-colors duration-500 group disabled:opacity-60"
                >
                  {checkingOut ? (
                    <>
                      <span className="font-mono text-[11px] uppercase tracking-[0.3em]">Redirecting…</span>
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.25} />
                    </>
                  ) : (
                    <>
                      <span className="font-mono text-[11px] uppercase tracking-[0.3em]">Check out</span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-2" strokeWidth={1.25} />
                    </>
                  )}
                </button>
```

- [ ] **Step 3: Remove the deleted routes from `App.js`**

Replace:

```js
import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { CartProvider } from "./context/CartContext";
import CartDrawer from "./components/CartDrawer";
import Landing from "./pages/Landing";
import Checkout from "./pages/Checkout";
import Success from "./pages/Success";
import { analytics } from "./lib/analytics";
import "./App.css";
```

with:

```js
import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { CartProvider } from "./context/CartContext";
import CartDrawer from "./components/CartDrawer";
import Landing from "./pages/Landing";
import { analytics } from "./lib/analytics";
import "./App.css";
```

Replace:

```jsx
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/success" element={<Success />} />
          </Routes>
```

with:

```jsx
          <Routes>
            <Route path="/" element={<Landing />} />
          </Routes>
```

- [ ] **Step 4: Delete the now-unused pages**

```bash
git rm src/pages/Checkout.js src/pages/Success.js
```

- [ ] **Step 5: Verify**

```bash
npm run build
```

Expected: `Compiled successfully.` with no "module not found" errors for the deleted pages (confirming no other file still imports them — `git grep -n "pages/Checkout\|pages/Success"` should return nothing after Step 4).

- [ ] **Step 6: Manual browser verification**

Since this repo has no automated frontend test framework, verify by hand:
1. `npm run dev`, open `http://localhost:3000`.
2. Scroll to the buy section, click "Add to bag" — drawer opens with 1 item, as before.
3. Click "Check out" with `shopify-config.js` still empty (from Task 2) — expect a toast: "Shopify isn't connected yet." No navigation, no crash.
4. Confirm `/checkout` and `/success` no longer exist as routes (visiting them directly shows nothing rendered, since only `/` is defined — this is expected; adding a 404 page is out of scope for this plan).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Wire cart checkout to Shopify, remove the old checkout/success pages

CartDrawer's Check out button now builds a Shopify hosted-checkout URL
for the cart's quantity and redirects there, instead of navigating to
the old backend-dependent 3-step wizard. Shows a clear message instead
of erroring when Shopify isn't configured yet. /checkout and /success
are deleted — Shopify's own checkout and order-status page replace them.
EOF
)"
```

---

### Task 4: Remove the waitlist feature from `BuyBlock.js`

**Files:**
- Modify: `src/components/BuyBlock.js` (full file replacement — the change touches imports, state, the grid layout, and removes roughly half the file)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new consumed by later tasks.

- [ ] **Step 1: Replace the full contents of `src/components/BuyBlock.js`**

```jsx
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight, Plus, Minus, ShoppingBag } from "lucide-react";
import { useCart } from "../context/CartContext";
import { analytics } from "../lib/analytics";

const EASE = [0.16, 1, 0.3, 1];

const BuyBlock = () => {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const buyRef = useRef(null);
  const viewFired = useRef(false);

  // Fire view_item once when the buy block becomes visible
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !viewFired.current) {
            viewFired.current = true;
            analytics.viewItem({
              id: "the-clear-120",
              name: "THE CLEAR — 120 ml",
              amount: 349,
              currency: "DKK",
            });
          }
        });
      },
      { threshold: 0.35 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleAddToBag = () => {
    addItem({ quantity: qty });
    analytics.addToCart({
      product_id: "the-clear-120",
      quantity: qty,
      subtotal: qty * 349,
      currency: "DKK",
    });
    toast("Added to bag.", { description: `${qty} × THE CLEAR` });
  };

  return (
    <section
      id="buy"
      ref={buyRef}
      data-testid="section-buy"
      className="relative py-32 md:py-48 px-6 md:px-10 lg:px-16 border-t border-white/10"
    >
      <div className="max-w-[1400px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 1.1, ease: EASE }}
          className="border-t border-white/12 pt-12"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60 mb-6">
            Shop · Free shipping over 400 DKK
          </p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div>
              <h3 className="font-display font-light text-5xl md:text-6xl lg:text-7xl tracking-[-0.03em] leading-[0.98]">
                THE CLEAR
              </h3>
              <p className="mt-6 max-w-[36ch] text-sm md:text-base opacity-70 leading-relaxed">
                Leave-on exfoliant. 120 ml / 4.0 fl oz.
                <br />
                2% BHA + Hyaluronic Acid. Nothing else.
              </p>
            </div>
            <div className="text-left md:text-right">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] opacity-60">Price</p>
              <p className="font-display font-light text-4xl md:text-5xl tracking-[-0.02em] mt-2" data-testid="product-price">
                349 <span className="text-2xl md:text-3xl opacity-60">DKK</span>
              </p>
            </div>
          </div>

          <div className="mt-14 flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
            {/* Quantity */}
            <div className="inline-flex items-center border border-[#F2EEE8]/25" data-testid="buy-quantity">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                data-testid="buy-qty-decrement"
                className="p-4 hover:bg-white/[0.05] transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3 w-3" strokeWidth={1.25} />
              </button>
              <span className="w-12 text-center font-mono text-sm tabular-nums" data-testid="buy-qty">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(5, q + 1))}
                data-testid="buy-qty-increment"
                disabled={qty >= 5}
                className="p-4 hover:bg-white/[0.05] transition-colors disabled:opacity-30"
                aria-label="Increase quantity"
              >
                <Plus className="h-3 w-3" strokeWidth={1.25} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToBag}
              data-testid="buy-cta"
              className="inline-flex items-center justify-center gap-4 bg-[#F2EEE8] text-[#1F1F1F] px-8 md:px-10 py-5 md:py-6 hover:bg-white transition-colors duration-500 group"
            >
              <ShoppingBag className="h-4 w-4" strokeWidth={1.4} />
              <span className="font-mono text-[11px] uppercase tracking-[0.3em]">Add to bag</span>
              <ArrowRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-2" strokeWidth={1.25} />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default BuyBlock;
```

What changed vs. the original: removed the `email`/`waitLoading`/`subscribed` state, the `handleWaitlist` function, the `API`/`REACT_APP_BACKEND_URL` constant, the `Loader2` import (only used by the waitlist form), and the entire "Right: waitlist" `motion.div` column. The outer grid (`grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-16` with `lg:col-span-7`/`lg:col-span-5`) is replaced by a plain single-column wrapper, since there's only one column left — the surviving buy content's own classes, animation props, and every `data-testid` are otherwise byte-for-byte identical to the original.

- [ ] **Step 2: Verify**

```bash
npm run build
```

Expected: `Compiled successfully.` with no unused-variable warnings for the removed waitlist state/imports.

- [ ] **Step 3: Manual browser verification**

`npm run dev`, scroll to the buy section: confirm it now shows only the product/price/quantity/"Add to bag" content, full-width, with no "Or join the list" column and no layout gap where it used to be.

- [ ] **Step 4: Commit**

```bash
git add src/components/BuyBlock.js
git commit -m "$(cat <<'EOF'
Remove waitlist feature from BuyBlock

The waitlist signup depended on the now-deleted backend + Resend
email. Per user decision, it's removed rather than replaced — the buy
column expands to fill the space. Product/price/quantity/Add-to-bag
UI, styling, and animations are otherwise unchanged.
EOF
)"
```

---

### Task 5: Update `.claude/` config for the new architecture

**Files:**
- Delete: `.claude/skills/mongo-patterns/` (entire directory), `.claude/skills/api-docs/` (entire directory), `.claude/skills/testing-patterns/scripts/gen-test.py`, `.claude/commands/seed-data.md`
- Modify: `.claude/agents/code-reviewer.md`, `.claude/agents/debugger.md`, `.claude/agents/planner.md`, `.claude/agents/researcher.md`, `.claude/agents/test-runner.md` (full file replacements — all short)
- Modify: `.claude/commands/deploy-check.md`, `.claude/commands/fix-issue.md`, `.claude/commands/review.md` (full file replacements — all short)
- Modify: `.claude/skills/code-style/SKILL.md`, `.claude/skills/code-style/references/style-guide.md` (full file replacements)
- Modify: `.claude/skills/testing-patterns/SKILL.md` (full file replacement)
- Modify: `.claude/skills/planning/references/plan-template.md` (targeted edit)
- Modify: `.claude/hooks/scripts/pre_commit_lint.py`, `.claude/hooks/scripts/post_write_format.py` (full file replacements)
- Modify: `.claude/hooks/block-dangerous-ops.md`, `.claude/hooks/pre-commit-lint.md`, `.claude/hooks/post-write-format.md` (targeted edits)

**Interfaces:** None — this task only touches documentation/tooling for Claude Code itself, not application code.

- [ ] **Step 1: Delete the obsolete skills and files**

```bash
git rm -r .claude/skills/mongo-patterns/
git rm -r .claude/skills/api-docs/
git rm .claude/skills/testing-patterns/scripts/gen-test.py
git rm .claude/commands/seed-data.md
```

(`seed-data.md` seeded MongoDB collections — there's no database at all anymore, so there's nothing left for this command to do. `gen-test.py` scaffolded pytest classes against the now-deleted backend.)

- [ ] **Step 2: Replace `.claude/agents/code-reviewer.md`**

```markdown
---
name: code-reviewer
description: Reviews diffs in this repo (a static React frontend connected to Shopify) for correctness, security, and consistency with existing patterns. Use before merging non-trivial changes.
tools: Read, Grep, Glob, Bash
model: sonnet
---

You review changes to the Nofilter Lab codebase: a React 19 + Tailwind + Craco static frontend under `src/`, connected to a Shopify store via `src/lib/shopify.js` and the values in `shopify-config.js`. There is no backend and no database — Shopify's own hosted checkout handles cart, payment, shipping, and tax.

Focus areas:
- **Shopify boundary**: all Shopify Buy SDK access goes through `src/lib/shopify.js` — flag any component calling `window.ShopifyBuy` directly. Flag any code that assumes `shopify-config.js` is always filled in without checking `isShopifyConfigured()` first.
- **Cart state**: cart state flows through `src/context/CartContext.js` — flag any component reading/writing `localStorage` directly instead of going through `useCart()`. Check new analytics events go through `src/lib/analytics.js` rather than calling PostHog directly.
- **No secrets**: `shopify-config.js` only ever holds a Storefront access token (public-scoped, meant to be client-side) — flag if anything tries to add an Admin API key or other private credential to client-side code.
- Don't flag style nits that existing code already violates consistently — match the codebase's actual conventions, not an abstract ideal.

Report findings as a concise list: file:line, what's wrong, why it matters. Skip praise and summaries of what looks fine.
```

- [ ] **Step 3: Replace `.claude/agents/debugger.md`**

```markdown
---
name: debugger
description: Root-causes bugs in this static React frontend before proposing a fix. Use for any unexpected behavior or bug report.
tools: Read, Grep, Glob, Bash
model: sonnet
---

You debug issues in the Nofilter Lab app — a static React frontend under `src/` with no backend, connected to a Shopify store via `src/lib/shopify.js`.

Approach:
1. Reproduce first. Check whether the bug is state-related (`CartContext`), a Shopify integration issue (`src/lib/shopify.js` — config missing, product handle wrong, variant lookup failing), or a pure UI/animation issue.
2. Read the actual code path end-to-end before hypothesizing. If it's a "checkout doesn't work" report, check `isShopifyConfigured()` first — an unconfigured or misconfigured `shopify-config.js` is the most common cause, not a code bug.
3. State the root cause explicitly before proposing a fix. Don't patch symptoms.
4. If the bug involves money (price display), remember prices are hardcoded display literals in `BuyBlock.js`/`Nav.js`/`CartContext.js` (matching the store's actual Shopify product price is the forker's responsibility, not fetched live) — don't assume there's a live price sync to debug.

Report: root cause, evidence for it, and the minimal fix — not a rewrite.
```

- [ ] **Step 4: Replace `.claude/agents/planner.md`**

```markdown
---
name: planner
description: Designs implementation plans for new features or refactors in this repo before code is written. Use for any multi-step change.
tools: Read, Grep, Glob, Bash
model: sonnet
---

You plan changes to the Nofilter Lab app: a React 19 + Tailwind static frontend (`src/`) with no backend, selling a single product through a forker's own Shopify store via `src/lib/shopify.js`.

Before proposing a plan:
- Read `memory/PRD.md` for current architecture, implemented features, and the deferred/backlog list — don't replan something already deferred intentionally without flagging the conflict.
- Read the actual current code for anything you're touching; don't plan against a remembered or assumed version of `CartContext.js` or `shopify.js`.

A good plan for this repo:
- Never adds a backend, a database, or server-side secrets — this project's entire pitch is "no backend, zero setup."
- Keeps all Shopify API access inside `src/lib/shopify.js`.
- Calls out new analytics events that should go through `src/lib/analytics.js`.
- Notes that there's no automated test framework — verification is `npm run build`/`npm run dev` compiling, ESLint, and manual browser QA (see `.claude/skills/testing-patterns/`).

Output a numbered step list with file paths, not prose. Flag open decisions the user needs to make rather than guessing silently.
```

- [ ] **Step 5: Replace `.claude/agents/researcher.md`**

```markdown
---
name: researcher
description: Answers open-ended "how does X work" or "where is Y handled" questions about this codebase by reading code, not guessing. Use for investigation tasks that don't yet need a plan or a fix.
tools: Read, Grep, Glob, Bash
model: sonnet
---

You investigate questions about the Nofilter Lab codebase (a React 19 static frontend in `src/`, no backend, Shopify integration in `src/lib/shopify.js`, product/architecture context in `memory/PRD.md`).

Rules:
- Answer from what you actually find in the code — grep and read before answering, don't infer from file/folder names alone.
- Cite file:line for every claim you make about behavior.
- If the answer differs from what `memory/PRD.md` describes, say so explicitly — the doc can be stale relative to the code.
- If you can't find something after a real search, say "not found in this repo" rather than speculating.

Report findings in plain prose with file:line citations — no need for a formal structure unless the question is broad enough to warrant one.
```

- [ ] **Step 6: Replace `.claude/agents/test-runner.md`**

```markdown
---
name: test-runner
description: Runs and interprets this repo's build/lint checks (there is no automated test suite), and reports failures with root cause, not just raw output. Use after implementation changes, before claiming work is done.
tools: Read, Grep, Glob, Bash
model: sonnet
---

You verify changes to this repo. There is no backend and no automated test framework (no `@testing-library/react`) — verification is build/lint based plus manual QA.

Commands:
- `npm run build` — production build; must complete with "Compiled successfully" and no errors.
- `npx eslint src` — lint check (requires an `eslint.config.js`; if one doesn't exist yet, report that as an environment gap, not a code bug — see `memory/PRD.md` Known Issues).

Rules:
- Never report "build passes" without having actually run the command in this turn and seen the output.
- On failure, read the failing file before guessing — report the actual error, not a paraphrase.
- If a failure looks environment-related (missing `node_modules`, wrong Node version, etc.), say so explicitly rather than treating it as a code bug.
- Manual browser QA (does the page render, does "Add to bag" work, does checkout redirect) cannot be automated in this environment — say so explicitly if asked to verify UI behavior rather than claiming you tested it.
```

- [ ] **Step 7: Replace `.claude/commands/deploy-check.md`**

```markdown
---
description: Sanity-check this repo is deployable before pushing/releasing
---

Check whether the Nofilter Lab app is in a deployable state:

1. Confirm `npm install` and `npm run build` succeed cleanly with no missing dependency warnings.
2. Confirm `shopify-config.js` has real values (not the empty placeholder strings) if this fork is meant to actually sell — a forker who deploys without configuring it will see a working site with a non-functional checkout, which is expected/by-design (not a bug) but worth confirming intentional.
3. Confirm no unrelated credentials are staged for commit (`git status` + inspect anything unfamiliar) — note that `shopify-config.js` itself is *meant* to be committed with real values (Shopify Storefront tokens are public/client-safe by design, unlike Admin API keys), so don't flag it as a leaked secret.
4. Confirm `memory/PRD.md`'s deferred/backlog section doesn't contain anything silently assumed "done" by the current diff.

Report a pass/fail checklist, not prose — one line per check.
```

- [ ] **Step 8: Replace `.claude/commands/fix-issue.md`**

```markdown
---
description: Root-cause and fix a specific bug or failing test in this repo
argument-hint: <bug description, error message, or failing test name>
---

Debug and fix the following issue in the Nofilter Lab app: $ARGUMENTS

1. Use the `debugger` subagent to find the root cause before proposing a fix. There's no automated test suite in this repo — reproduce via `npm run dev` and manual browser interaction, or by reading the relevant code path (`CartContext`, `src/lib/shopify.js`, or the affected component).
2. Once the root cause is confirmed, implement the minimal fix — not a surrounding refactor.
3. Use the `test-runner` subagent to confirm `npm run build` still succeeds, and manually re-verify the fixed behavior in the browser.

Report: root cause, the fix, and how you confirmed it.
```

- [ ] **Step 9: Replace `.claude/commands/review.md`**

```markdown
---
description: Review the current diff for correctness, security, and consistency with this repo's conventions
---

Review the pending changes (`git diff` and `git status` for untracked files) in this repo.

Use the `code-reviewer` subagent. Focus on:
- All Shopify API access staying inside `src/lib/shopify.js` (no direct `window.ShopifyBuy` calls elsewhere).
- Cart state going through `CartContext`, not ad-hoc `localStorage` access.
- New analytics events routed through `src/lib/analytics.js`.
- No Shopify Admin API keys or other private credentials added to client-side code (Storefront tokens in `shopify-config.js` are fine — they're meant to be public).

Report findings as file:line + issue + why it matters. Skip anything that's just a pre-existing pattern being repeated consistently.
```

- [ ] **Step 10: Replace `.claude/skills/code-style/SKILL.md`**

```markdown
---
name: code-style
description: Code style conventions for this repo (static React frontend, Shopify-connected). Use before writing or editing anything under src/ so new code matches existing patterns.
---

Read `references/style-guide.md` for the conventions actually used in this codebase (derived from the existing code, not a generic style guide). Follow it when writing or editing anything under `src/`.

If you're about to write code that doesn't fit a documented pattern, match the nearest existing analogous code instead of introducing a new convention.
```

- [ ] **Step 11: Replace `.claude/skills/code-style/references/style-guide.md`**

```markdown
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
```

- [ ] **Step 12: Replace `.claude/skills/testing-patterns/SKILL.md`**

```markdown
---
name: testing-patterns
description: Notes on this repo's (lack of) test tooling. Use before assuming a test framework exists that doesn't.
---

This project has no automated test framework — no backend (nothing to run tests against) and no frontend component test framework (`@testing-library/react` is not installed, though the default Craco/`react-scripts test` runner scaffold is present via `npm test`).

Verify changes via: `npm run build` (or `npm run dev`) compiling cleanly, ESLint, and manual browser QA. Don't invent a test framework or write tests against a harness that isn't set up — flag it instead if real test coverage becomes necessary.
```

- [ ] **Step 13: Edit `.claude/skills/planning/references/plan-template.md`**

Replace:

```markdown
## Data model changes
New/changed Mongo collections or fields, if any. Reference `.claude/skills/mongo-patterns/` for conventions.

## Test plan
What in `backend/tests/` gets added/updated. Reference `.claude/skills/testing-patterns/`.
```

with:

```markdown
## Data model changes
N/A — this project has no database; product data lives in the forker's own Shopify store.

## Test plan
This project has no automated test framework (verify via `npm run build`/`npm run dev` compiling cleanly, ESLint, and manual browser QA). Reference `.claude/skills/testing-patterns/`.
```

- [ ] **Step 14: Replace `.claude/hooks/scripts/pre_commit_lint.py`**

```python
#!/usr/bin/env python3
"""PreToolUse hook (matcher: Bash). Lints staged files before letting `git commit` run.

Only lints files actually staged for this commit (not the whole tree) so
pre-existing, unrelated violations elsewhere in the repo never block a commit.
Exit 2 blocks the commit; stderr (lint output) is surfaced back to Claude.
"""
import json
import os
import re
import subprocess
import sys


def staged_files(cwd):
    r = subprocess.run(
        ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
        cwd=cwd, capture_output=True, text=True,
    )
    return [f for f in r.stdout.splitlines() if f.strip()]


def main():
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        sys.exit(0)

    command = payload.get("tool_input", {}).get("command", "")
    if not re.search(r"\bgit\s+commit\b", command):
        sys.exit(0)

    cwd = payload.get("cwd") or os.getcwd()
    files = staged_files(cwd)
    js_files = [f for f in files if f.endswith((".js", ".jsx")) and f.startswith("src/")]

    errors = []

    if js_files:
        r = subprocess.run(
            ["npx", "eslint", "--max-warnings=0"] + js_files,
            cwd=cwd,
            capture_output=True, text=True, shell=(os.name == "nt"),
        )
        if r.returncode != 0:
            errors.append("eslint:\n" + r.stdout + r.stderr)

    if errors:
        print("\n\n".join(errors), file=sys.stderr)
        sys.exit(2)
    sys.exit(0)


if __name__ == "__main__":
    main()
```

(The backend/flake8 half is removed entirely — there's no backend. The frontend half now targets `src/` directly, not `frontend/src/`, and runs `npx eslint` instead of `yarn eslint` since Task 1 switched to npm.)

- [ ] **Step 15: Replace `.claude/hooks/scripts/post_write_format.py`**

```python
#!/usr/bin/env python3
"""PostToolUse hook (matcher: Edit|Write). Formats the file Claude just touched.

Only handles Python (`black`) — there's no backend anymore, so this only ever
applies to files like .claude/hooks/scripts/*.py. Silently does nothing if
`black` isn't installed (this repo has no Python dependency file to install it
from). No JS/TS formatter (e.g. prettier) is installed for the frontend yet,
so .js/.jsx files are left alone — add prettier and extend this script if wanted.
"""
import json
import subprocess
import sys


def main():
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        sys.exit(0)

    file_path = payload.get("tool_input", {}).get("file_path", "")

    if file_path.endswith(".py"):
        try:
            subprocess.run(["python", "-m", "black", "-q", file_path], capture_output=True, text=True)
        except FileNotFoundError:
            pass

    sys.exit(0)


if __name__ == "__main__":
    main()
```

- [ ] **Step 16: Edit `.claude/hooks/block-dangerous-ops.md`**

Replace:

```markdown
- anything touching `backend/.env`, `frontend/.env`, or other credential files (delete/overwrite)
```

with:

```markdown
- anything touching `.env`, `shopify-config.js`, or other credential files (delete/overwrite)
```

(This is a documentation-only fix — `block_dangerous_ops.py`'s actual `DANGEROUS_PATTERNS` list matches shell command patterns like `rm -rf`, not specific filenames, so this line was always descriptive text rather than an implemented check; that pre-existing doc/implementation gap is unrelated to this restructuring and out of scope here.)

- [ ] **Step 17: Edit `.claude/hooks/pre-commit-lint.md`**

Replace:

```markdown
**Status: active.** Implemented as `.claude/hooks/scripts/pre_commit_lint.py`, wired into `.claude/settings.local.json`'s `PreToolUse` → `Bash` matcher. It only fires when the Bash command matches `git commit`, and only lints files actually staged for that commit (via `git diff --cached --name-only`) — pre-existing violations elsewhere in the repo never block a commit. Runs `flake8` (via the backend `.venv`) on staged `backend/*.py` files and `yarn eslint` on staged `frontend/src/*.js(x)` files; exit `2` with the lint output blocks the commit.
```

with:

```markdown
**Status: active.** Implemented as `.claude/hooks/scripts/pre_commit_lint.py`, wired into `.claude/settings.local.json`'s `PreToolUse` → `Bash` matcher. It only fires when the Bash command matches `git commit`, and only lints files actually staged for that commit (via `git diff --cached --name-only`) — pre-existing violations elsewhere in the repo never block a commit. Runs `npx eslint` on staged `src/*.js(x)` files; exit `2` with the lint output blocks the commit. There is no backend anymore, so the flake8 half of this hook was removed.
```

- [ ] **Step 18: Edit `.claude/hooks/post-write-format.md`**

Replace:

```markdown
**Status: active, Python only.** Implemented as `.claude/hooks/scripts/post_write_format.py`, wired into `.claude/settings.local.json`'s `PostToolUse` → `Edit|Write` matcher. Runs `black` (via the backend `.venv`, already a dependency) on any `.py` file Claude writes/edits. `.js`/`.jsx` files are left alone — there's no `prettier` in `frontend/devDependencies` yet; add it and extend the script if you want that too.
```

with:

```markdown
**Status: active, Python only.** Implemented as `.claude/hooks/scripts/post_write_format.py`, wired into `.claude/settings.local.json`'s `PostToolUse` → `Edit|Write` matcher. Runs `black` on any `.py` file Claude writes/edits, if `black` is available on the system (there's no backend/venv anymore, so this only ever applies to files like `.claude/hooks/scripts/*.py`, and silently no-ops if `black` isn't installed). `.js`/`.jsx` files are left alone — there's no `prettier` in this project's devDependencies yet; add it and extend the script if you want that too.
```

- [ ] **Step 19: Verify the hooks still work**

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"git status"},"cwd":"'"$(pwd -W 2>/dev/null || pwd)"'"}' | python .claude/hooks/scripts/pre_commit_lint.py; echo "exit=$?"
```

Expected: `exit=0` (fast no-op for a non-commit command — this just confirms the script still parses and runs after the edit, matching how it was verified when first written).

- [ ] **Step 20: Commit**

```bash
git add .claude/
git commit -m "$(cat <<'EOF'
Update .claude/ config for the new backend-free, Shopify-connected architecture

Removes mongo-patterns and api-docs skills (no database, no backend
API anymore), the seed-data command (nothing to seed), and the
pytest-based test-scaffold generator (no backend to generate tests
for). Updates agents, remaining commands, code-style, testing-patterns,
the planning template, and both hook scripts so none of them describe
or assume the deleted FastAPI/Mongo backend.
EOF
)"
```

---

### Task 6: `guide.html` and `README.md`

**Files:**
- Create: `guide.html` (repo root)
- Modify: `README.md` (full file replacement — currently a one-line stub)

**Interfaces:** None — these are standalone documentation files, not imported by any code.

- [ ] **Step 1: Create `guide.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Set up your store — Nofilter Lab template</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&family=Courier+Prime:wght@400;700&display=swap" rel="stylesheet" />
<style>
  :root {
    --bone: #F2EEE8;
    --ink: #1F1F1F;
    --accent: #9AA6B2;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bone);
    color: var(--ink);
    font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
    font-weight: 300;
    line-height: 1.6;
  }
  .wrap { max-width: 760px; margin: 0 auto; padding: 64px 24px 120px; }
  header.page-header { margin-bottom: 64px; }
  .eyebrow {
    font-family: 'Courier Prime', monospace;
    font-size: 11px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    opacity: 0.55;
    margin: 0 0 20px;
  }
  h1 {
    font-weight: 300;
    font-size: clamp(32px, 6vw, 52px);
    letter-spacing: -0.02em;
    line-height: 1.05;
    margin: 0 0 20px;
  }
  .lede { font-size: 18px; opacity: 0.8; max-width: 52ch; margin: 0; }
  .step {
    border-top: 1px solid rgba(31,31,31,0.15);
    padding: 48px 0;
  }
  .step:last-of-type { border-bottom: 1px solid rgba(31,31,31,0.15); }
  .step-number {
    font-family: 'Courier Prime', monospace;
    font-size: 13px;
    letter-spacing: 0.2em;
    opacity: 0.55;
    margin: 0 0 12px;
  }
  .step h2 {
    font-weight: 400;
    font-size: clamp(22px, 4vw, 30px);
    letter-spacing: -0.01em;
    margin: 0 0 16px;
  }
  .step p { font-size: 16px; margin: 0 0 16px; }
  .step ol, .step ul { padding-left: 22px; margin: 0 0 16px; }
  .step li { margin-bottom: 10px; font-size: 16px; }
  code, pre {
    font-family: 'Courier Prime', monospace;
    background: rgba(31,31,31,0.06);
  }
  code { padding: 2px 6px; font-size: 0.9em; }
  pre {
    padding: 16px 20px;
    overflow-x: auto;
    font-size: 14px;
    margin: 0 0 16px;
  }
  .checkpoint {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    background: rgba(31,31,31,0.05);
    padding: 16px 20px;
    margin-top: 20px;
  }
  .checkpoint .mark {
    font-family: 'Courier Prime', monospace;
    font-size: 11px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    opacity: 0.6;
    white-space: nowrap;
    padding-top: 2px;
  }
  .checkpoint p { margin: 0; font-size: 15px; }
  .screenshot {
    border: 1px dashed rgba(31,31,31,0.3);
    padding: 40px 20px;
    text-align: center;
    font-family: 'Courier Prime', monospace;
    font-size: 13px;
    opacity: 0.6;
    margin: 20px 0;
  }
  .note {
    font-size: 14px;
    opacity: 0.65;
    border-left: 2px solid var(--accent);
    padding-left: 16px;
    margin: 16px 0;
  }
  a { color: var(--ink); }
  footer.page-footer {
    margin-top: 64px;
    padding-top: 32px;
    border-top: 1px solid rgba(31,31,31,0.15);
    font-size: 13px;
    opacity: 0.55;
  }
</style>
</head>
<body>
<div class="wrap">
  <header class="page-header">
    <p class="eyebrow">Nofilter Lab · Store setup guide</p>
    <h1>Get your own store running in about 15 minutes.</h1>
    <p class="lede">No coding required. You'll download this project, create a free Shopify store, and paste 3 values into one file. That's it — Shopify handles your cart, checkout, payments, shipping, and taxes automatically.</p>
  </header>

  <section class="step">
    <p class="step-number">Step 1 of 6</p>
    <h2>Get a copy of this project</h2>
    <p>On the GitHub page for this project, click the green <strong>"Use this template"</strong> or <strong>"Fork"</strong> button near the top right. This creates your own personal copy that you fully own and control.</p>
    <div class="screenshot">📸 Screenshot: the "Fork" button on the GitHub project page</div>
    <p>Then download it to your computer. Click the green <strong>"Code"</strong> button, then <strong>"Download ZIP"</strong>, and unzip it somewhere easy to find, like your Desktop.</p>
    <div class="screenshot">📸 Screenshot: the "Code" → "Download ZIP" menu</div>
    <div class="checkpoint">
      <span class="mark">✓ You should see</span>
      <p>A folder on your computer containing files like <code>package.json</code>, <code>shopify-config.js</code>, and a <code>src</code> folder.</p>
    </div>
  </section>

  <section class="step">
    <p class="step-number">Step 2 of 6</p>
    <h2>Create a free Shopify store and add your product</h2>
    <p>Go to <a href="https://www.shopify.com" target="_blank" rel="noopener">shopify.com</a> and start a free trial — you don't need to enter payment details or launch a real store to follow this guide.</p>
    <p>Once you're in your store's admin dashboard:</p>
    <ol>
      <li>In the left sidebar, click <strong>Products</strong>.</li>
      <li>Click <strong>Add product</strong>.</li>
      <li>Fill in a title, description, price, and at least one photo, then click <strong>Save</strong>.</li>
    </ol>
    <div class="screenshot">📸 Screenshot: the Shopify "Add product" page, filled in</div>
    <div class="checkpoint">
      <span class="mark">✓ You should see</span>
      <p>Your product listed on the Products page, with a status of "Active."</p>
    </div>
  </section>

  <section class="step">
    <p class="step-number">Step 3 of 6</p>
    <h2>Turn on the Storefront API and copy your 2 keys</h2>
    <p>This is the part that lets your website talk to your Shopify store. It sounds technical, but it's just a few clicks:</p>
    <ol>
      <li>In your Shopify admin, click <strong>Settings</strong> (bottom of the left sidebar), then <strong>Apps and sales channels</strong>.</li>
      <li>Click <strong>Develop apps</strong> (you may need to click a button to allow custom app development first — Shopify will walk you through a one-time confirmation).</li>
      <li>Click <strong>Create an app</strong>, give it any name (e.g. "My Website"), and click <strong>Create app</strong>.</li>
      <li>Click the <strong>Configuration</strong> tab, then <strong>Configure</strong> next to "Storefront API".</li>
      <li>Check the boxes for reading products and reading checkouts, then click <strong>Save</strong>.</li>
      <li>Click the <strong>API credentials</strong> tab, then <strong>Install app</strong>.</li>
      <li>Under "Storefront API access token", click <strong>Reveal token once</strong> and copy it somewhere safe.</li>
    </ol>
    <div class="screenshot">📸 Screenshot: the "API credentials" tab showing the revealed Storefront token</div>
    <p>You also need your <strong>store domain</strong> — it's the web address you use to log in, ending in <code>.myshopify.com</code> (for example <code>my-cool-shop.myshopify.com</code>).</p>
    <p>Finally, find your <strong>product handle</strong>: go back to your product page in Shopify admin and click <strong>View</strong> (or Preview). Look at the web address — the part after <code>/products/</code> is your handle (for example, if the address ends in <code>/products/the-clear</code>, your handle is <code>the-clear</code>).</p>
    <div class="checkpoint">
      <span class="mark">✓ You should have</span>
      <p>Three things written down: your store domain, your Storefront API access token, and your product handle.</p>
    </div>
  </section>

  <section class="step">
    <p class="step-number">Step 4 of 6</p>
    <h2>Paste your 3 values into shopify-config.js</h2>
    <p>In the project folder you downloaded, open <code>shopify-config.js</code> with any text editor (even Notepad works, though a free editor like <a href="https://code.visualstudio.com" target="_blank" rel="noopener">VS Code</a> is easier to read). You'll see this:</p>
    <pre>const shopifyConfig = {
  storeDomain: "",
  storefrontAccessToken: "",
  productHandle: "",
};</pre>
    <p>Paste your 3 values between the quotes, so it looks like this (using your own real values, not these examples):</p>
    <pre>const shopifyConfig = {
  storeDomain: "my-cool-shop.myshopify.com",
  storefrontAccessToken: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  productHandle: "the-clear",
};</pre>
    <p>Save the file.</p>
    <div class="checkpoint">
      <span class="mark">✓ You should see</span>
      <p>Your 3 real values between the quotes — no more empty <code>""</code> pairs.</p>
    </div>
  </section>

  <section class="step">
    <p class="step-number">Step 5 of 6</p>
    <h2>Preview your site on your own computer</h2>
    <p>You'll need <a href="https://nodejs.org" target="_blank" rel="noopener">Node.js</a> installed first (if you're not sure, download and install it from that link — any recent version works).</p>
    <p>Open a terminal (on Mac: Terminal app; on Windows: search for "PowerShell" or "Command Prompt") and navigate into your project folder, then run:</p>
    <pre>npm install</pre>
    <p>This downloads everything the site needs — it can take a minute or two, and you'll only need to do it once. Then run:</p>
    <pre>npm run dev</pre>
    <div class="checkpoint">
      <span class="mark">✓ You should see</span>
      <p>A message like <code>Local: http://localhost:3000</code>. Open that address in your browser to see your site. Try clicking "Add to bag" then "Check out" — it should take you to your Shopify checkout page.</p>
    </div>
  </section>

  <section class="step">
    <p class="step-number">Step 6 of 6</p>
    <h2>Publish it online</h2>
    <p>The easiest option is <a href="https://www.netlify.com/" target="_blank" rel="noopener">Netlify</a> — no command line needed:</p>
    <ol>
      <li>Run <code>npm run build</code> in your project folder — this creates a <code>build</code> folder.</li>
      <li>Go to <a href="https://app.netlify.com/drop" target="_blank" rel="noopener">app.netlify.com/drop</a>.</li>
      <li>Drag your <code>build</code> folder onto the page.</li>
    </ol>
    <div class="screenshot">📸 Screenshot: dragging the build folder onto Netlify Drop</div>
    <p><a href="https://vercel.com" target="_blank" rel="noopener">Vercel</a> offers a similar drag-and-drop option if you'd rather use that instead.</p>
    <div class="checkpoint">
      <span class="mark">✓ You should see</span>
      <p>A live web address (something like <code>your-site-name.netlify.app</code>) that anyone can visit.</p>
    </div>
  </section>

  <div class="note">
    <strong>One thing to know:</strong> because payment happens on Shopify's own checkout page, your site can't show a custom "thank you" page after someone buys — the customer sees Shopify's own order confirmation instead. This is normal and true of every site set up this way, not something broken in your setup.
  </div>

  <footer class="page-footer">
    Questions or stuck on a step? Re-read the checkpoint for that step first — it tells you exactly what you should be seeing. If something still doesn't match, double check the values in <code>shopify-config.js</code> are pasted exactly as Shopify shows them, with no extra spaces.
  </footer>
</div>
</body>
</html>
```

- [ ] **Step 2: Replace `README.md`**

```markdown
# Nofilter Lab — Shopify-Connected Template

A premium, animated product landing page that connects to your own Shopify store — no backend, no coding required to set up.

**New here? Start with [`guide.html`](./guide.html)** — open it in your browser for a step-by-step, plain-language walkthrough (fork this project, create a free Shopify store, connect it, and publish your site).

## Quick reference (if you already know what you're doing)

```bash
npm install
npm run dev
```

Then paste your Shopify store domain, Storefront access token, and product handle into `shopify-config.js`.

To build for production:

```bash
npm run build
```
```

- [ ] **Step 3: Verify `guide.html` renders correctly**

Open `guide.html` directly in a browser (double-click it, or `file://` path — it needs no build step or server). Confirm: fonts load, all 6 steps are present with checkpoints, no broken layout.

- [ ] **Step 4: Commit**

```bash
git add guide.html README.md
git commit -m "$(cat <<'EOF'
Add guide.html and rewrite README.md for non-technical forkers

guide.html walks through forking the repo, creating a free Shopify
store, enabling the Storefront API, pasting the 3 config values,
previewing locally, and publishing via Netlify/Vercel drag-and-drop.
README.md now points there first instead of the old placeholder stub.
EOF
)"
```

---

### Task 7: Update `memory/PRD.md` to reflect the final architecture

**Files:**
- Modify: `memory/PRD.md` (targeted edits to the Architecture, Backend Endpoints, Frontend routes, and Deferred/Backlog sections; new dated changelog entry)

**Interfaces:** None — documentation only.

- [ ] **Step 1: Read the current `memory/PRD.md` in full before editing**

Its content has changed since Task 1 started (this plan doesn't restate it here since it's a living document you should read fresh, not diff against a snapshot that may already be stale by the time you reach this task).

- [ ] **Step 2: Add a new dated entry under "What's Been Implemented"**

Following the existing pattern of dated subsections in that file, add one for this change (use today's actual date) summarizing: the move to a single root-level npm project, the backend's full removal, the Shopify Buy SDK integration (`shopify-config.js` + `src/lib/shopify.js`, wired into `CartDrawer.js`'s checkout button), the removal of `/checkout`/`/success` and the waitlist feature, and the new `guide.html`/`README.md`. Link to this plan's file path and its design spec (`docs/superpowers/specs/2026-07-06-shopify-forkable-template-design.md`).

- [ ] **Step 3: Update the "Architecture" section**

Replace the "Backend" bullet (currently describing FastAPI + Motor + Stripe + Resend) — there is no backend. Replace with something describing the Shopify Buy SDK integration living entirely in the frontend.

- [ ] **Step 4: Remove or rewrite the "Backend Endpoints" section**

Every endpoint listed no longer exists. Replace the section with a short note that this project has no backend, and point to `src/lib/shopify.js` as where Shopify integration logic lives instead.

- [ ] **Step 5: Update the "Frontend routes" section**

Remove the `/checkout` and `/success` entries — only `/` remains.

- [ ] **Step 6: Update "Deferred / Backlog"**

Remove backlog items that no longer apply because the backend they referred to is gone (e.g. "Real webhook verification with Stripe signing secret," "Embedded Stripe Payment Element," "Order history / customer accounts" — all backend-dependent). Keep items that still make sense for a static frontend (e.g. "Danish locale variant," "Address autocomplete" is no longer applicable either since Shopify's checkout handles the address form now — remove it too). Add a note that multi-variant product support is out of scope per this change's Global Constraints.

- [ ] **Step 7: Commit**

```bash
git add memory/PRD.md
git commit -m "$(cat <<'EOF'
Document the Shopify-connected, backend-free architecture in PRD

Updates Architecture, Backend Endpoints, Frontend routes, and the
Deferred/Backlog list to match reality after removing the FastAPI
backend and wiring checkout to Shopify.
EOF
)"
```

## Self-Review Notes

- **Spec coverage**: project restructure (Task 1) ✓, Shopify config + client (Task 2) ✓, checkout wiring + route removal (Task 3) ✓, waitlist removal (Task 4) ✓, `.claude/` cleanup (Task 5) ✓, `guide.html` + `README.md` (Task 6) ✓, PRD update (Task 7, called out as "Out of scope: only current-state sections" in the spec — respected by only touching Architecture/Endpoints/Routes/Backlog, not historical sections) ✓.
- **Placeholder scan**: none — every code-bearing step has complete file contents or precise before/after snippets; Task 7's steps are documentation-editing instructions (not code), which is why they're phrased as edit directions rather than exact diffs — the file they edit is explicitly a living document that will have changed by the time this task runs, so diffing against a snapshot taken now would be actively misleading.
- **Type/name consistency**: `isShopifyConfigured()` and `buildCheckoutUrl({ quantity })` (Task 2) are the exact names imported in Task 3's `CartDrawer.js` diff. `shopify-config.js`'s 3 field names (`storeDomain`, `storefrontAccessToken`, `productHandle`) match what `src/lib/shopify.js` destructures and what `guide.html` tells forkers to paste.
- **Verified, not guessed**: the npm/yarn migration fix (Task 1, Step 6) and the `ModuleScopePlugin` cross-boundary import patch (Task 2, Step 3) were both directly tested against this actual dependency tree and actual `craco.config.js` before being written into this plan — not assumed to work.
