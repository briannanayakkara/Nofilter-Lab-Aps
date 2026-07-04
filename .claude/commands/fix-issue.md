---
description: Root-cause and fix a specific bug or failing test in this repo
argument-hint: <bug description, error message, or failing test name>
---

Debug and fix the following issue in the Nofilter Lab app: $ARGUMENTS

1. Use the `debugger` subagent to find the root cause before proposing a fix. Reproduce it if possible (relevant tests live in `backend/tests/`, or check the frontend flow it affects).
2. Once the root cause is confirmed, implement the minimal fix — not a surrounding refactor.
3. Use the `test-runner` subagent to run the relevant suite and confirm the fix, and confirm no other tests regressed.

Report: root cause, the fix, and the test result that confirms it.
