# ADR 0001 — Backend and frontend runtime framework

Status: **proposed** (open — needs a concrete blocker before deciding)
Date: 2026-05-07

## Context

The PoC runs on **Next.js 16 (App Router)** with React 19, RSC, and Next API routes. Auth (`better-auth`), DB (Drizzle + Postgres), and the agents (`voltagent` on Vercel AI SDK) are all wired to this single Next.js process.

A draft architecture (the predecessor of `architecture.md`) proposed migrating to **Fastify (backend) + Vite + React + TanStack Router (frontend SPA)** with the rationale: *"Fastify's plugin lifecycle is the substrate modules build on."* The proposal also bundled migrating from yarn 4 workspaces to pnpm.

The decision touches: backend HTTP runtime, frontend build pipeline, routing model (file-based + RSC vs SPA), authentication integration, deployment shape (single Node process vs split build), and how the module registry is bootstrapped.

This is the largest single decision in the architecture. Getting it wrong costs months. Picking it casually would be the worst kind of mistake.

## Decision

**Not yet made.** This ADR exists to make sure we do not migrate by default and do not stay by inertia. We will decide once one of the conditions in "What would force a decision" below is met.

Until then, the PoC stays on Next.js. New work assumes Next.js.

## Alternatives

### A. Stay on Next.js 16

**For:**
- The PoC already works. Auth, DB, agents, AI streaming, and the salesperson UI are all on it.
- RSC + streaming responses are a real fit for AI-generated content (offer drafts streaming into a review panel).
- Single deploy artifact (Node process serves API + UI). No frontend/backend split for operators.
- App Router's middleware + route handlers cover the API surface today.
- Vercel AI SDK and `voltagent` work cleanly inside Next.js route handlers.

**Against:**
- Module registry bootstrap is awkward in Next.js. There is no "app start" hook in the App Router; first-request initialization is the conventional pattern, which is fragile (cold start vs warm worker, edge vs Node, dev vs prod).
- App Router's RSC + client component split introduces a real mental tax for module authors who only need a couple of admin pages.
- Frontend module bundles loaded as ESM at runtime fight against Next's bundling model. Module Federation in Next is possible but rough.
- Some upgrades (React canary features, server actions evolution) move faster than ours can absorb.
- Lock-in to Vercel-flavored conventions even when self-hosting.

### B. Migrate to Fastify + Vite + React + TanStack Router

**For:**
- Fastify's plugin lifecycle is a clean place to register modules at startup. A real "boot, then serve" model.
- A separate Vite-built SPA makes loading module UI bundles as ESM natural.
- TanStack Router and TanStack Form are TS-first and play well with Zod schemas — relevant for the schema-driven config UI.
- Operators self-hosting prefer "boring Node" backends; Fastify is well understood.
- Decouples backend from frontend release cadence.

**Against:**
- Total rewrite of the existing app. The PoC's auth, agent wiring, AI streaming, and routing all need to be redone.
- Two build pipelines instead of one. Two deploy surfaces unless we re-bundle them.
- We lose RSC and streaming-by-default for AI output; we have to rebuild streaming over WebSocket or SSE manually.
- The "plugin lifecycle" advantage is theoretical until we have a module that actually exercises it. v0 modules are first-party and can register through any boot-time function — no runtime install, no dynamic registration.
- Bundling pnpm migration into the same step compounds risk for no extra payoff.

### C. Hybrid — keep Next.js, add a Fastify worker only when needed

**For:**
- No rewrite. Salesperson UI stays on Next.js.
- A Fastify-based worker process can be added later for graphile-worker job execution and any pure-backend module surfaces (e.g., webhook intake) that don't share a request-response model with the UI.
- Path to migrate the salesperson UI later if the App Router model becomes a real blocker, with the worker already running.

**Against:**
- Two runtime models in one repo from the moment the worker exists.
- Module authors have to think about which runtime their module's surfaces target.
- Operators run two processes.

## What would force a decision

We will decide between (A) stay, (B) migrate, or (C) hybrid when one of these is concretely true and documented:

1. **Module bootstrap is genuinely broken on Next.js.** A real first-party module (or the catalog-tool starter pack module) cannot register cleanly at app start, and the workaround is materially worse than re-platforming.
2. **Frontend module bundles cannot ship.** A real module needs to load a UI bundle dynamically and Next's bundling model makes it impractical *and* Module Federation is rejected for a stated reason.
3. **Streaming AI output forces a different model.** A real review-time interaction needs streaming behavior Next.js cannot provide cleanly.
4. **Job-runner co-location forces a worker process.** When graphile-worker is added, decide whether the worker is a Fastify process or another Next.js process — that decision likely settles this ADR.

If none of these is true, we stay on Next.js by default and revisit after the catalog module is shipped.

## Consequences

- Until decided, all stack-level work proceeds against Next.js. New code does not assume Fastify.
- The migration shape called out in the previous draft architecture (step 1: re-platform on Fastify) is **paused**. The migration shape will be rewritten once this ADR is closed.
- The agent-flow-framework decision (voltagent vs alternatives) is independent of this ADR and gets its own ADR if and when needed.
- The package-manager decision (yarn 4 vs pnpm) is independent and trivial — handled in a separate ADR if it ever becomes a real question. It is not packaged with this one.

## Notes

A useful frame for whoever closes this ADR: **what does Fastify give us that we cannot replicate with a registration module that runs at Next.js app start?** If the answer is "nothing concrete yet," the answer is (A). If the answer is something specific and load-bearing, it is (B) or (C) depending on scope.
