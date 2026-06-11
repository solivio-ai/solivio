# Solivio Architecture

Status: high-level architecture — reflects the build-time-codegen modular monolith (`adr/0002`)
Audience: contributors, integrators, operators
Last updated: 2026-06-10

Solivio turns an unstructured customer request into an accepted, dispatched offer. The product is the **pipeline that connects request to offer to customer**, with a salesperson in the loop.

This document describes the *shape* of the system. Stack choices live in `adr/`. The module system mechanics live in `module-system.md` and `codegen.md`; the SDK contract in `contracts.md`; the current agents in `agents.md`.

---

## 1. Principles

- **One pipeline, many surfaces.** Capture, understand, enrich, draft, review, accept, dispatch, learn — a single core pipeline. The *sources* of input, *sources* of context, *formats* of output, and *destinations* of output are pluggable.
- **Small core, feature modules.** The core owns auth, the app shell, and the runtime; everything offer-shaped lives in modules that are compiled into the app at build time.
- **Agent-driven inside, deterministic at the edges.** Named AI agents do the squishy work. The transitions around them are deterministic, validated, and audited.
- **Each instance gets smarter over time.** Salesperson edits and accepted offers feed a learning loop that resurfaces as instance-memory tools — no model fine-tuning.

## 2. Tenancy, isolation, and the operator model

**Solivio is single-tenant per deployment.** One instance serves one client. There is no `tenant_id` on canonical tables. Audit, secrets, storage, configuration, and AI cost limits are all scoped per deployment, not per tenant. Multi-tenant SaaS is not a v0 path.

**Composing a deployment is a build-time operation.** `solivio.config.ts` lists the enabled modules (and their options and slot bindings); `yarn generate` wires them; the Next.js build compiles them in. Enabling a module = edit the config + rebuild the image. This supersedes the earlier load-at-startup bundle-loader model (`SOLIVIO_MODULES_DIR`) — the "drop a bundle, restart, no rebuild" property was deliberately traded for first-class module pages/routes, declaration-merged types, and one bundling model (`adr/0002`). Out-of-tree modules are npm packages with `"solivio": { "module": true }`, installed and listed in the config like any in-tree module.

**Module isolation is enforced by codegen and lint, not by the runtime.** All module code runs in-process with full trust. The boundaries are: the generator validates the module graph; `scripts/check-boundaries.mts` (part of `yarn check`) forbids cross-module and module→app imports; and the database rules (own tables, id-only references) keep data ownership clean. There are no separate database users, no row-level security, no sandboxing. There is no marketplace and no runtime install.

## 3. Two layers: core and modules

### 3.1 The core (`apps/solivio`)

The core is small, stable, and irreplaceable. It owns:

- **authentication** (better-auth), the session proxy, the login page, and user administration (`/admin/users`) — the `users` table stays core-owned and is exposed to modules only through the `users` service,
- the **app shell**: root layouts, the sidebar (rendering the generated nav registry), theming, and i18n plumbing,
- the **runtime boot** (`instrumentation.ts` → `src/server/runtime/boot.ts`): assembling the SDK runtime from the generated registries — services container, logger, Drizzle handle, AI model routing, auth guards, importer resolution,
- the **jobs/events engine** (pg-boss on the same Postgres, `adr/0004`),
- **operational surface**: `/api/health`, the migration runner that applies the core journal plus every module journal at startup,
- the **generated wiring** (`src/generated/**` and the `(gen)` app trees) — generator-owned, gitignored.

The core does not know about offers, products, or customers. Those are modules.

### 3.2 Modules (`modules/<id>`)

A module is a TypeScript source package discovered by file convention and wired by `yarn generate`. It can contribute pages, API routes, services, typed events, subscribers, jobs, agent tools, importers, OpenAPI contracts, i18n, nav entries, slot fills, ACL permissions — and own its database tables with its own migration journal. Mechanics: `module-system.md`.

The hard lines:

- **Calls** between modules go through typed services (`getService()`) and events (`emitEvent()`), never imports. The one exception is a type-only import of a dependency's `services.ts` for the typecheck.
- **Data** crosses module boundaries as id-only references — no FK constraints onto another module's tables and no SQL joins across them; display data is fetched through batch service lookups.
- **Infrastructure** is reached only through `@solivio/sdk/runtime` accessors.

### 3.3 Current modules and dependency direction

`dependsOn` declarations form a small DAG (validated acyclic by the generator):

```
customers ◄──┐
             ├── offers ◄── offer-chat
catalog  ◄───┘
   ▲
   └── products-sync                csv-import (headless; no deps)
```

- **catalog** — products + prices, semantic search, import target `product`.
- **customers** — customers + intake requests, import target `customer`.
- **offers** — offer lifecycle: drafts, line items, revisions, PDF, the generation/name/validation agents, the copilot's offer-editing tools, and all offer-facing UI including the dashboard (`/`).
- **offer-chat** — the offer review chat *domain*: threads, messages, the copilot agent, streaming routes.
- **csv-import** — CSV importer capabilities for the product/customer import targets (bound via config `slots`).
- **products-sync** — the reference example: scheduled sync of products from an external source into the catalog.

One deliberate seam: the chat **panel UI lives in offers** (it integrates imperatively with the offer review screen) while the chat **domain lives in offer-chat**; the panel reaches it over HTTP only. When UI cohesion and domain ownership pull apart, HTTP is the boundary that lets each module keep what it owns.

## 4. The extension surfaces

The long-term surface taxonomy — inputs, enrichment, renderers, channels — still frames where capabilities belong. Implemented today:

- **Importers** (input) — pure transforms (raw payload → normalized records) declared in `ai/importers.ts`; the owning module's import route persists the records. Exclusive per target, selected by a config slot.
- **Agent tools** (enrichment) — declared in `ai/tools.ts`, merged into one registry, consumed by agents via `getAgentTools()`.
- **Slots** (UI) — typed injection points (`SlotPropsMap`) that modules fill via `slots.tsx`.
- **Events + subscribers** (cross-cutting) — typed observer events; subscribers have no mutation rights over another module's state except through its services.
- **Jobs** — cron-schedulable background work on the queue.

Renderers and channels as formal capability kinds remain future surfaces; today PDF rendering lives inside the offers module.

For v0, **one provider per exclusive capability**. Cross-provider merging (dedup, conflict, priority) is deferred until a real need appears.

## 5. Shared infrastructure

The `@solivio/sdk/runtime` accessors are the only path to shared infrastructure — modules never reach for raw `process.env`-backed singletons, the app's database client, or another module's internals. The runtime hands out: the typed services container, a structured logger tagged per module, the shared Drizzle handle, deployment AI model ids (`getAi().modelFor(role)`), session guards (`getAuth()`), importer resolution, the agent-tool registry, validated module options, event emission, and job enqueueing. The full table is in `module-system.md` §8.

A blob `StorageProvider` (filesystem default, S3-compatible optional) remains a planned addition, not yet in the runtime.

## 6. Agents

Named agents live **in the module that owns their domain**: offers owns generation/name/validation, offer-chat owns the salesperson copilot, catalog owns product search. The core contributes the per-role model routing (`getAi().modelFor(role)`, env-overridable per role) — not the agents themselves. Modules extend each other's agents indirectly by contributing **tools** to the shared registry; the copilot in offer-chat runs with tools contributed by offers. Current inventory and file map: `agents.md`.

Agent construction is **lazy**: agents are built memoized inside handlers, never at import time, because the SDK runtime only exists after instrumentation boot.

**AI failure handling** (declared fallback modes, cost/rate limits, full audit ledger) remains the target model; today failures surface to the salesperson UI and structured logs.

## 7. Pipeline state and observer events

Pipeline transitions are deterministic and validated inside the owning module's services. After significant changes a module emits a typed **event** (`<moduleId>.<entity>.<action>`). Subscribers — in-process or persistent (queued, at-least-once) — do cross-cutting work: notify, sync, learn. **Subscribers have no mutation rights** over other modules' state; to request a change they call that module's service, which validates it.

## 8. Validation as a typed rule registry

The target model is unchanged: modules register typed validation rules (`PriceRule`, `MarginRule`, …) with priority and scope; the validation phase runs them in order; `block` halts, `warn` records an overridable warning. Today validation is AI-assisted inside the offers module (`offerValidationAgent`); the typed rule registry is a future capability kind.

## 9. Data ownership

Each module owns its tables and its migration journal; the core owns the auth tables and its own journal. Every module table is named `<module_id>` or `<module_id>_*` (snake_case; no exceptions). Cross-module references are id-only — no FK constraints cross module boundaries (`adr/0003`). PostgreSQL (with pgvector) is the system of record. Details: `database.md`.

## 10. AI safety

AI surfaces are treated as security boundaries.

- **Prompt layering.** Trusted system prompt + trusted tool descriptions + untrusted user content clearly marked. Customer text never appears where it could be interpreted as instructions. Output is constrained by structured-output schemas wherever possible.
- **Output validation.** Agent outputs are validated against expected schemas before they affect state; schema-failed drafts are surfaced, never silently rendered.
- **Audit.** Tracing via VoltOps is opt-in per deployment (`VOLTAGENT_*` env vars); the full evidence-ledger model (reproduce any accepted offer from its trail) remains the target.
- **Cost and rate limits.** Per-role model selection keeps cheap roles on small models; explicit budgets/limits are future work.
- **Authorization.** Only authenticated salespeople trigger agent runs; module API routes guard with `getAuth().requireAuth()`/`requireAdmin()`.

## 11. The default deployment

The stock image, built from this repo's `solivio.config.ts`, ships the six first-party modules (§3.3) and runs the pipeline end-to-end with one AI provider credential and a Postgres connection. Larger integrations (Odoo, HubSpot, WhatsApp, voice) are intended to live outside this repo as out-of-tree module packages.

## 12. Out of scope (v0)

- multi-tenant SaaS with shared deployments,
- runtime plugin installation, plugin marketplace, hot-loadable adapters, out-of-process / sidecar modules — and, since `adr/0002`, **no-rebuild module install** of any kind,
- a public REST/GraphQL API for third-party app developers (distinct from the integration SDK),
- runtime prompt management (experimentation UI, A/B comparisons, runtime prompt edits),
- automatic table or storage cleanup on module uninstall,
- merging tool results across multiple providers of the same capability per agent,
- model fine-tuning as a learning mechanism,
- ERP write-back of orders or invoices,
- microservice decomposition.

## 13. Short version

A small **core** (auth, app shell, runtime boot, jobs engine) hosts feature **modules** compiled in at build time by codegen. Modules own their pages, routes, services, events, jobs, agents, and tables; they talk through typed services and events, reference each other's data by id only, and reach infrastructure only through the SDK runtime. A deployment is composed in `solivio.config.ts` and built into an image — config + rebuild, not runtime loading. Single-tenant per deployment, isolation by codegen + lint, growing by adding modules — not by rearchitecting the core.
