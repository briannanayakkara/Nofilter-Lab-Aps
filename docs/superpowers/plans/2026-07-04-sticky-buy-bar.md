# Sticky Nav Purchase Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make "Add to bag" reachable from anywhere on the page by turning the existing fixed `Nav` bar into a purchase bar once the visitor scrolls past the hero.

**Architecture:** Single-file change to `frontend/src/components/Nav.js`. Reuses the component's existing `darkTheme` scroll-position state (already flips `true` once `window.scrollY > window.innerHeight * 1.2`) as the trigger — no new scroll listener, no new component, no backend or `CartContext` changes.

**Tech Stack:** React 19, Framer Motion (`AnimatePresence`/`motion` — already used throughout this file), Tailwind CSS, `sonner` (toast), existing `useCart()` context, existing `analytics` wrapper.

## Global Constraints

- No changes to `BuyBlock.js`, `CartContext.js`, the cart drawer, or any backend endpoint (per spec's "Out of scope").
- Nav CTA always adds exactly 1 unit (no quantity selector) — matches the approved "one-click" behavior.
- Price shown (`349 DKK`) is a hardcoded literal matching `BuyBlock.js`'s existing pattern (not fetched from `/api/products/the-clear-120`) — do not introduce a new source of truth in this change.
- `data-testid` values are inline string literals directly on JSX elements, matching this file's existing convention (`site-nav`, `nav-logo`, `nav-bag`, `nav-link-*`) — do NOT route through `frontend/src/constants/testIds/` (that directory exists but is not imported/used anywhere in the codebase today; introducing it here would be an unrelated convention change).
- This repo has no frontend component test framework (`@testing-library/react` is not installed) — verification is via ESLint, dev-server compilation, and manual browser QA, not new automated tests. Do not add a testing library as a side effect of this task.

---

### Task 1: Sticky purchase bar in Nav

**Files:**
- Modify: `frontend/src/components/Nav.js` (full file, 113 lines currently)

**Interfaces:**
- Consumes: `useCart()` from `frontend/src/context/CartContext.js` — already exposes `addItem(overrides = {})` (adds/merges an item, default `product_id: "the-clear-120"`), `openDrawer()`, `totalQuantity`. This task additionally consumes `addItem` (not previously used in `Nav.js`).
- Consumes: `analytics.addToCart({ product_id, quantity, subtotal, currency })` from `frontend/src/lib/analytics.js` (existing, used identically in `BuyBlock.js`).
- Consumes: `toast` from `sonner` (existing dependency, used identically in `BuyBlock.js`).
- Produces: nothing new consumed by other files — `Nav.js` has no external consumers of its internals (it's rendered once in `Landing.js` with no props).

- [ ] **Step 1: Replace the full contents of `frontend/src/components/Nav.js`**

```jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "../context/CartContext";
import { analytics } from "../lib/analytics";

const EASE = [0.16, 1, 0.3, 1];

const Nav = () => {
  const [scrolled, setScrolled] = useState(false);
  const [darkTheme, setDarkTheme] = useState(false);
  const { totalQuantity, openDrawer, addItem } = useCart();

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      const heroHeight = window.innerHeight * 1.2;
      setDarkTheme(y > heroHeight);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isInk = darkTheme;
  const fg = isInk ? "#F2EEE8" : "#1F1F1F";
  const bgClass = scrolled
    ? isInk
      ? "bg-[#1F1F1F]/70 backdrop-blur-xl"
      : "bg-[#F2EEE8]/70 backdrop-blur-xl"
    : "bg-transparent";

  const navItems = [
    { label: "The Clear", href: "#the-clear" },
    { label: "Ingredients", href: "#ingredients" },
    { label: "Results", href: "#results" },
    { label: "Details", href: "#details" },
    { label: "FAQ", href: "#faq" },
  ];

  const handleQuickAdd = () => {
    addItem({ quantity: 1 });
    analytics.addToCart({
      product_id: "the-clear-120",
      quantity: 1,
      subtotal: 349,
      currency: "DKK",
    });
    toast("Added to bag.", { description: "1 × THE CLEAR" });
  };

  return (
    <motion.header
      data-testid="site-nav"
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-700 ${bgClass}`}
      style={{ color: fg }}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 lg:px-14 h-16 md:h-20 flex items-center justify-between">
        <a href="#top" data-testid="nav-logo" className="flex items-center gap-2 select-none" aria-label="Nofilter Lab home">
          <AnimatePresence mode="wait">
            <motion.img
              key={isInk ? "light" : "dark"}
              src={isInk ? "/assets/logo-white.svg" : "/assets/logo-black.svg"}
              alt="Nofilter Lab"
              className="h-4 md:h-[18px] w-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            />
          </AnimatePresence>
        </a>

        <AnimatePresence mode="wait">
          {darkTheme ? (
            <motion.div
              key="purchase-bar"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="hidden md:flex items-center gap-6"
              data-testid="nav-purchase-bar"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.24em] opacity-70">
                THE CLEAR — 349 DKK
              </span>
              <button
                type="button"
                onClick={handleQuickAdd}
                data-testid="nav-buy-cta"
                className="inline-flex items-center gap-2 bg-[#F2EEE8] text-[#1F1F1F] px-5 py-2.5 hover:bg-white transition-colors duration-500"
                aria-label="Add THE CLEAR to bag"
              >
                <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.4} />
                <span className="font-mono text-[11px] uppercase tracking-[0.24em]">Add to bag</span>
              </button>
            </motion.div>
          ) : (
            <motion.nav
              key="nav-links"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="hidden md:flex items-center gap-10"
            >
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className="text-[13px] tracking-wide opacity-70 hover:opacity-100 transition-opacity duration-500"
                >
                  {item.label}
                </a>
              ))}
            </motion.nav>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-4">
          <AnimatePresence>
            {darkTheme && (
              <motion.button
                key="mobile-buy"
                type="button"
                onClick={handleQuickAdd}
                data-testid="nav-buy-cta-mobile"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="md:hidden inline-flex items-center gap-1.5 bg-[#F2EEE8] text-[#1F1F1F] px-3.5 py-2 hover:bg-white transition-colors duration-500"
                aria-label="Add THE CLEAR to bag"
              >
                <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.4} />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Buy</span>
              </motion.button>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={openDrawer}
            data-testid="nav-bag"
            className="relative flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity duration-500"
            aria-label="Open bag"
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={1.4} />
            <span className="font-mono text-[11px] uppercase tracking-[0.24em]">
              Bag
            </span>
            <AnimatePresence>
              {totalQuantity > 0 && (
                <motion.span
                  key="bag-count"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="font-mono text-[10px] tabular-nums leading-none tracking-normal"
                  data-testid="nav-bag-count"
                  style={{ color: fg, opacity: 0.9 }}
                >
                  ({totalQuantity})
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </motion.header>
  );
};

export default Nav;
```

What changed vs. the original file:
- New imports: `toast` from `sonner`, `analytics` from `../lib/analytics`.
- `useCart()` destructure now includes `addItem`.
- New `handleQuickAdd` function.
- The old `<nav className="hidden md:flex items-center gap-10">...</nav>` block is now wrapped in an `AnimatePresence` that swaps between the original nav links (when `darkTheme` is `false`) and a new purchase bar (`THE CLEAR — 349 DKK` + "Add to bag" button) when `darkTheme` is `true`.
- The Bag `<button>` is now nested inside a new wrapping `<div className="flex items-center gap-4">` alongside a new mobile-only "Buy" button (`md:hidden`, only rendered when `darkTheme` is `true`) — this wrapper keeps the outer row's `justify-between` layout to exactly 3 children (logo / center block / right group), so adding the mobile button doesn't get centered by `justify-between` instead of sitting next to Bag.

- [ ] **Step 2: Lint the changed file**

Run: `cd frontend && yarn eslint src/components/Nav.js --max-warnings=0`
Expected: no output, exit code 0. If it reports issues, fix them before continuing (common ones: unused import if a copy-paste step was skipped, missing `key` prop — all keys are already present above).

- [ ] **Step 3: Confirm the dev server compiles**

If the dev server isn't already running:
```
cd frontend && yarn start
```
Expected in the terminal: `Compiled successfully!` with no errors. If it's already running (check `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000`), saving the file triggers hot-reload — watch the terminal output for `Compiled successfully!` and no red error overlay in the browser.

- [ ] **Step 4: Static sanity check — confirm the new strings made it into the served bundle**

Run:
```
curl -s http://localhost:3000/static/js/bundle.js | grep -o "nav-buy-cta" | head -1
curl -s http://localhost:3000/static/js/bundle.js | grep -o "Add to bag" | head -1
```
Expected: both commands print the matched string (confirms the new code compiled into the bundle actually being served — catches a stale-server/wrong-port mistake, not full behavior).

- [ ] **Step 5: Manual browser verification**

Open `http://localhost:3000` in a browser (desktop width):
1. On page load: confirm the nav shows the logo, the 5 nav links (The Clear / Ingredients / Results / Details / FAQ), and "Bag" on the right — no purchase bar, no "Add to bag" button in the nav yet.
2. Scroll down past the hero (roughly 1.2× your viewport height — keep scrolling until the nav background and text visibly invert, which is the existing `darkTheme` transition). Confirm the nav links are replaced by "THE CLEAR — 349 DKK" and an "Add to bag" button.
3. Click "Add to bag" in the nav. Confirm: the cart drawer slides open, shows 1× THE CLEAR, and a toast reading "Added to bag." appears.
4. Scroll back to the top. Confirm the purchase bar disappears and the original nav links return.
5. Resize the browser to a mobile width (< 768px, Tailwind's `md` breakpoint) and repeat steps 1–3: confirm no purchase bar/CTA at the top, and after scrolling past the hero, a compact "Buy" button appears next to the "Bag" icon (not centered in the nav) — click it and confirm the same drawer/toast behavior.

If any of these don't match, fix `Nav.js` before proceeding — do not commit with a failing manual check.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Nav.js
git commit -m "$(cat <<'EOF'
Add sticky purchase bar to Nav so buying works from anywhere

The only Add to bag control was inside BuyBlock, below the full
cinematic hero scroll — reuses Nav's existing scroll-position state
to swap the nav links for a buy CTA once past the hero.
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage**: trigger (reuses `darkTheme`) ✓, desktop layout (nav links → price + CTA) ✓, mobile layout (compact Buy next to Bag) ✓, click behavior (matches `BuyBlock.handleAddToBag` exactly: `addItem({quantity:1})`, `analytics.addToCart`, toast, cart drawer opens via `openDrawer`) ✓, `data-testid="nav-buy-cta"` ✓ (plus `nav-buy-cta-mobile` for the mobile variant, needed since it's a distinct DOM node), out-of-scope items untouched ✓.
- **Placeholder scan**: none — full file content given, exact commands given, exact expected output given.
- **Type/name consistency**: `handleQuickAdd`, `addItem`, `analytics.addToCart`, `openDrawer`, `totalQuantity` all match their existing definitions in `CartContext.js` and `analytics.js` (verified by reading both files during design) — no invented APIs.
