---
description: Sanity-check this repo is deployable before pushing/releasing
---

Check whether the Nofilter Lab app is in a deployable state:

1. Confirm `npm install` and `npm run build` succeed cleanly with no missing dependency warnings.
2. Confirm `shopify-config.js` has real values (not the empty placeholder strings) if this fork is meant to actually sell — a forker who deploys without configuring it will see a working site with a non-functional checkout, which is expected/by-design (not a bug) but worth confirming intentional.
3. Confirm no unrelated credentials are staged for commit (`git status` + inspect anything unfamiliar) — note that `shopify-config.js` itself is *meant* to be committed with real values (Shopify Storefront tokens are public/client-safe by design, unlike Admin API keys), so don't flag it as a leaked secret.
4. Confirm `memory/PRD.md`'s deferred/backlog section doesn't contain anything silently assumed "done" by the current diff.

Report a pass/fail checklist, not prose — one line per check.
