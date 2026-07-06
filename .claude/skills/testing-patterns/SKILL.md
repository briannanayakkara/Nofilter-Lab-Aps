---
name: testing-patterns
description: Notes on this repo's (lack of) test tooling. Use before assuming a test framework exists that doesn't.
---

This project has no automated test framework — no backend (nothing to run tests against) and no frontend component test framework (`@testing-library/react` is not installed, though the default Craco/`react-scripts test` runner scaffold is present via `npm test`).

Verify changes via: `npm run build` (or `npm run dev`) compiling cleanly, ESLint, and manual browser QA. Don't invent a test framework or write tests against a harness that isn't set up — flag it instead if real test coverage becomes necessary.
