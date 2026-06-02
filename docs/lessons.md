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

### 2026-06-02 — Avoid PR cache writes

**Context:** PR feedback suggested adding `actions: write` so a `pull_request` Docker build could export to the GitHub Actions cache.
**Rule:** PR workflows that run untrusted branch code should keep `GITHUB_TOKEN` read-only and should not write shared caches; prefer uncached PR builds unless a trusted-only cache writer is separated from PR execution.
**Applies to:** `.github/workflows/*.yml`, especially Docker/BuildKit cache settings.
