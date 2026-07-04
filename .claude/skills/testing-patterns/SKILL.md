---
name: testing-patterns
description: Backend test conventions for this repo (pytest, requests-against-live-server style) and a scaffold generator. Use before writing a new backend test file or test class.
---

Backend tests (`backend/tests/`) are integration-style: they run `requests` calls against a live server at `$REACT_APP_BACKEND_URL`, not FastAPI's `TestClient`, and use a direct `pymongo` connection for persistence assertions. Test classes are grouped by feature (`TestProduct`, `TestWaitlist`, etc.), one method per case.

`pytest.ini` pins `-n 2 --dist loadscope` (pytest-xdist) — **do not change `addopts`**; tests within a class/module run on the same worker, but classes/modules can run in parallel, so don't rely on cross-class ordering or shared mutable state beyond what a fixture scopes explicitly.

To scaffold a new test class matching this repo's conventions, run:

```
python .claude/skills/testing-patterns/scripts/gen-test.py <FeatureName> <METHOD> <path>
```

e.g. `python .claude/skills/testing-patterns/scripts/gen-test.py Checkout POST /api/checkout/quote` prints a `TestCheckout` class skeleton to stdout — review and fill in real assertions before adding it to a test file; it's a starting point, not a finished test.

Frontend has no test suite yet beyond the default Craco/`react-scripts test` runner scaffold — there's no established pattern to follow there yet, so don't invent one silently; flag it if a frontend test is needed.
