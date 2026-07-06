---
name: planning
description: Template and conventions for writing implementation plans for this repo. Use when starting a multi-step change, or via the /plan command.
---

Use `references/plan-template.md` as the shape for any implementation plan in this repo. Fill it in from the actual current code and `memory/PRD.md` — don't plan against a remembered or assumed state.

Keep plans scoped to one coherent change. If a request spans independent pieces (e.g. "add order history AND a Danish locale toggle"), write separate plans rather than one combined one — see `memory/PRD.md`'s Deferred/Backlog list for pieces that are already known-independent.
