# Plan: <short title>

## Goal
What this change accomplishes and why, in 1-3 sentences.

## Current state
What exists today, with file:line references. Read the actual code — don't rely on `memory/PRD.md` alone, it can be stale.

## Approach
The chosen approach, and briefly why (if alternatives were considered).

## Steps
1. `path/to/file` — what changes, and why this order (e.g. backend endpoint before the frontend call that needs it)
2. ...

## Data model changes
N/A — this project has no database; product data lives in the forker's own Shopify store.

## Test plan
This project has no automated test framework (verify via `npm run build`/`npm run dev` compiling cleanly, ESLint, and manual browser QA). Reference `.claude/skills/testing-patterns/`.

## Open questions
Anything that needs a decision before implementation starts — don't guess and bury the assumption in code.
