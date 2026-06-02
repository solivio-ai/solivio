# Lessons

A running log of corrections, gotchas, and recurring mistakes — so an agent (or a contributor) does not repeat them.

## How to use this file

- After the user corrects you, or after you hit a non-obvious gotcha, add an entry here.
- If the lesson is a durable rule, also fold it into the relevant `Always` / `Never` list in `AGENTS.md` or the matching `docs/` guide — this log is for the long tail, the boundary lists are for the load-bearing rules.
- Keep entries short and concrete: what happened, the rule that prevents it, and where it applies.

## Format

Newest first. One entry per lesson:

```
### YYYY-MM-DD — short title

**Context:** what was being done and what went wrong.
**Rule:** the concrete thing to do (or avoid) next time.
**Applies to:** files, modules, or commands the rule covers.
```

## Lessons

### 2026-06-02 — Avoid proxy API schema barrels

**Context:** During the OpenAPI migration, a central schema export file made route
schemas look reusable even when they only existed to support generation.
**Rule:** Keep route-only request and response schemas beside the route handler;
move schemas to shared modules only when they are actually reused, and import
shared schemas from their concrete owner module rather than a dummy barrel.
**Applies to:** `apps/solivio/src/app/api/**/route.ts`,
`apps/solivio/src/server/api/schemas/`, and OpenAPI generation.
