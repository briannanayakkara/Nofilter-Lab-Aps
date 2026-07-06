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
