---
description: Root-cause and fix a specific bug or failing test in this repo
argument-hint: <bug description, error message, or failing test name>
---

Debug and fix the following issue in the Nofilter Lab app: $ARGUMENTS

1. Use the `debugger` subagent to find the root cause before proposing a fix. There's no automated test suite in this repo — reproduce via `npm run dev` and manual browser interaction, or by reading the relevant code path (`CartContext`, `src/lib/shopify.js`, or the affected component).
2. Once the root cause is confirmed, implement the minimal fix — not a surrounding refactor.
3. Use the `test-runner` subagent to confirm `npm run build` still succeeds, and manually re-verify the fixed behavior in the browser.

Report: root cause, the fix, and how you confirmed it.
