# Architecture Decision Records

This directory holds ADRs for Solivio. Each ADR captures one decision, its alternatives, and its rationale.

The architecture document (`../architecture.md`) describes the *shape* of the system without committing to specific frameworks or libraries. Stack-level choices that are real bets — large blast radius, hard to reverse — live here. One decision per file.

## Format

Each ADR has: status (proposed / accepted / superseded), context (the problem and constraints), decision (what we choose), alternatives (what we rejected and why), and consequences (what this commits us to).

Keep ADRs short. If you find yourself writing more than two pages, you are probably making more than one decision.

## Index

| # | Title | Status |
|---|---|---|
| [0001](0001-runtime-framework.md) | Backend and frontend runtime framework | proposed |

## Future ADRs (likely)

These are decisions the architecture document hand-waves and which deserve their own ADR before they are made:

- Agent flow framework (today: voltagent; the public SDK should not couple to it)
- Job runner (today: none; graphile-worker proposed)
- Package manager (today: yarn 4 workspaces; pnpm proposed)
- Storage abstraction (FS volume default; S3-compatible optional — the contract itself is settled, the backend choice per deployment is operator config, not an ADR)
- Module UI bundle loading strategy (ESM dynamic imports vs Module Federation)
- Prompt versioning and rollback (Git-tagged TS constants for v0; rollback story for production)

A future ADR should not exist as a stub. Open one only when there is a concrete reason to decide.
