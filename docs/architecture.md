# Solivio Architecture

Status: high-level architecture
Audience: contributors, integrators, operators
Last updated: 2026-05-07

Solivio turns an unstructured customer request into an accepted, dispatched offer. The product is the **pipeline that connects request to offer to customer**, with a salesperson in the loop.

This document describes the *shape* of the system. Stack choices live in `adr/`. Canonical schemas and service interfaces live in `contracts.md`. The current set of named agents lives in `agents.md`.

---

## 1. Principles

- **One pipeline, many surfaces.** Capture, understand, enrich, draft, review, accept, dispatch, learn — a single core pipeline. The *sources* of input, *sources* of context, *formats* of output, and *destinations* of output are pluggable.
- **Stable core, replaceable everything else.** The core owns canonical state, the pipeline state machine, and the named AI agents. Modules sit around it.
- **Agent-driven inside, deterministic at the edges.** Named AI agents do the squishy work. Pipeline transitions around them are deterministic, validated, and audited.
- **Each instance gets smarter over time.** Salesperson edits and accepted offers feed a learning loop that resurfaces as instance-memory tools — no model fine-tuning.

## 2. Tenancy and isolation — explicit

**Solivio is single-tenant per deployment.** One instance serves one client. There is no `tenant_id` on canonical tables. Audit, secrets, storage, configuration, and AI cost limits are all scoped per deployment, not per tenant. Multi-tenant SaaS is not a v0 path; if it ever becomes one, it is a schema-wide rework, not a flag.

**Module isolation is enforced by code review and lint, not by the runtime.** All modules in v0 are first-party or operator-shipped code in the operator's image. There are no separate database users, no row-level security, and no `search_path` scoping. A module receives a Drizzle handle, a logger, a storage namespace, a config object, and a typed set of core service handles — all by convention.

There is no marketplace, no runtime install, no untrusted plugin code. If a deployment needs runtime isolation between modules and the core, it is not Solivio v0.

## 3. Two layers: core and modules

### 3.1 The core

The core is small, stable, and irreplaceable. It owns:

- the **offer lifecycle state machine** (draft → in_review → validated → accepted, with reopens, immutable accepted snapshots, and explicit failure transitions like `agent_failed` and `dispatch_failed`),
- **canonical persistence** for requests, requirements, customers, products, offers, revisions, accepted snapshots,
- the **named agent system** — registry, prompt assembly, model dispatch, tool invocation, fallback handling,
- the **canonical service interfaces** modules call to request changes (modules never write canonical tables directly),
- the **validation phase** — runs registered typed rules in declared priority order,
- the **audit / evidence ledger** — records every state change and every AI interaction,
- the **module registry** and **instance configuration**,
- the **shared infrastructure** described in section 5.

The core does not know about specific external systems, file formats, transport protocols, or specific AI prompts. It speaks in canonical entities, named transitions, named agents, and the surfaces / tools / rules modules expose.

### 3.2 Modules

A module is a unit of replaceable behavior. It can:

- implement one or more **surfaces** (input, enrichment, renderer, channel),
- register **tools** named agents can call,
- register **always-loaded context providers** the core injects into an agent before it runs,
- register **typed validation rules** the validation phase runs,
- register **prompt fragments** appended to specific agents' system prompts,
- own **its own tables** for module-private state (FK to canonical tables permitted; ON DELETE behavior is decided by an explicit policy in `contracts.md`, not by the module),
- subscribe to **pipeline observer events** (no mutation rights — see section 7).

The hard line is on **canonical writes**: modules cannot mutate canonical state directly. They request changes through core service handles. Modules read canonical entities through the same handles.

## 4. The four extension surfaces

- **Inputs** — turn raw inbound events (form, email, webhook, voice) into a normalized request. The core persists the raw payload before normalization for replay.
- **Enrichment** — expose data to agents in one of two modes:
  - **Tools (agent-callable).** The agent decides whether to call them based on intent (`search_catalog`, `lookup_industry_standard`, `recall_instance_memory`).
  - **Always-loaded context (deterministic).** The core fetches them before the agent runs and injects them into prompt context (applicable pricing rules, mandatory legal disclaimers, customer credit status).
  The split exists because some knowledge is too important to be optional. Treating pricing rules or legal constraints as agent-decided tools is a bug.
- **Renderers** — turn an accepted offer snapshot into an artifact (PDF, DOCX, JSON, plain text). Pure: snapshot in, artifact out.
- **Channels** — dispatch a rendered artifact to a destination (email, CRM, webhook, manual download). Channels never mutate offer state — acceptance happens *first*, dispatch happens *after*.

For v0, **one provider per capability per agent**. Cross-provider merging (dedup, conflict, priority) is deferred until a real need appears.

## 5. Shared infrastructure

Every module receives a **context object** at boot and on each invocation. The context is the only path to shared infrastructure. Modules never reach for raw `process.env`, raw file IO, or raw database connections.

The context exposes: a Drizzle handle scoped to the module's own tables, structured logging tagged with module id and pipeline correlation id, a job-queue handle, a configuration + secrets resolver, an event bus for observer events, an AI client factory, an agent invoker (for renderers and channels that internally call an agent), an i18n translator, and a typed handle to canonical core services.

**Storage** is a `StorageProvider` interface with two implementations: a filesystem volume (default) and S3-compatible (optional). Both expose `put` / `get` / `delete` / `signedUrl`. Keys are namespaced: `core/...` is core-owned, `mod_<id>/...` is module-owned. A module's `storage.put(key, ...)` is transparently prefixed with `mod_<id>/`. A module needing a core-owned blob goes through a typed core service.

The exact backend framework, frontend framework, agent flow framework, and job runner are decided in `adr/`.

## 6. Agents

Solivio runs several named agents. They are **owned by the core**, not contributed by modules — agent runs touch canonical state, downstream contracts, and audit, and need to be tightly coupled to the core to do that safely.

Each agent has, owned by the core's agent definition: a base system prompt, model configuration (provider, model, temperature, fallback model), flow definition, the set of tool capabilities and always-loaded capabilities it expects, fallback behavior, and defaults for missing capabilities.

Modules extend agents three ways, in order of risk:

1. **Contribute tools / always-loaded context (low).** A module declares an enrichment capability the agent expects; the core wires it in. This is the primary extension path.
2. **Contribute prompt fragments (medium).** A module appends scoped instructions to a specific agent's system prompt. Composed in declared order, version-controlled in instance config.
3. **Replace the agent wholesale (high).** Install a module that takes over an agent's name with higher priority. Same output schema, same tool capabilities. Strong SDK conformance tests required; instance config explicitly opts in.

**AI failure is first-class.** Every agent declares a fallback mode (skip-with-warning, retry-with-cheaper-model, escalate-to-salesperson, fail-the-transition). The pipeline state machine has explicit `agent_failed` transitions. Salesperson UI surfaces failures with partial output and a manual override path. Per-instance cost and rate limits live in core configuration; when tripped, the agent fails into its declared fallback — never silent degradation.

For the current set of named agents in this repo, see `agents.md`.

## 7. Pipeline state and observer events

Pipeline transitions are deterministic, named, and validated by core services. After each transition, the core fires an **observer event**. Modules subscribe for cross-cutting work (notify Slack on `offer_accepted`, push to CRM, log analytics, trigger learning extraction on `feedback_captured`).

**Observer events have no mutation rights.** A subscriber can do anything in its own state, call out to external systems, or enqueue work — but it cannot change canonical state from inside an event handler. To request a state change in response to an event, the subscriber calls a core service explicitly, where the core validates the transition and audits who requested it.

## 8. Validation as a typed rule registry

The one place modules influence state *before* a transition is validation. This is a rule registry, not hook subscriptions.

Modules register typed rules (`PriceRule`, `MarginRule`, `LegalRule`, `StockRule`, …) at boot, each with explicit priority and scope. The validation phase runs all applicable rules in priority order. A rule returns `pass`, `warn`, or `block` with a structured reason. `block` halts the transition; `warn` records an override the salesperson can take (override is audited). Conflicts are resolved by priority and explicit precedence in instance config. Outcomes are deterministic and auditable.

## 9. Data ownership

The core owns canonical tables — requests, requirements, customers, products, offers, revisions, accepted snapshots, audit events, dispatch records, learning events, module registry, instance config — and is the only writer.

Modules own everything else. Module table names are prefixed by module id. Module migrations ship inside the module package.

PostgreSQL (with pgvector) is the system of record for structured data. Storage holds blobs.

## 10. AI safety

AI surfaces are treated as security boundaries.

- **Prompt layering.** Trusted system prompt + trusted tool descriptions + untrusted user content clearly marked. Customer text never appears where it could be interpreted as instructions. Output is constrained by structured-output schemas wherever possible.
- **Output validation.** Agent outputs are validated against expected schemas before they affect canonical state. Schema-failed drafts are retried per the agent's fallback policy, then escalated — never silently rendered.
- **Audit ledger.** Every agent call records: agent id, model, prompt version, system prompt, user input, tool calls, tool results, raw output, validated output, latency, cost. An accepted offer can be reproduced from this trail.
- **Cost and rate limits.** Per-instance budget, per-request token caps, per-user rate limits. AI failures fall back per the agent's declared mode.
- **Sensitive data.** PII handling rules are configured per instance. The starter pack ships conservative defaults.
- **Authorization.** Only authenticated salespeople and configured automated input adapters trigger agent runs. Tool calls inherit caller authorization.

## 11. Starter pack

The official image ships a starter pack of first-party modules. After clone and standard setup, the operator gets a working pipeline end-to-end with one AI provider credential, a Postgres connection, and a storage volume:

- **manual-input** — form-based request entry,
- **csv-products** — CSV upload and product indexing,
- **catalog-tool** — `search_catalog` over locally-indexed products,
- **instance-memory-tool** — recalls accepted offers and salesperson corrections,
- **pdf-renderer** — PDF generation,
- **manual-download** — "download offer" channel.

The core ships with default first-party agent definitions (see `agents.md`) with tested prompts and conservative model defaults. These are not modules — they are owned by the core.

Larger integrations (Odoo, HubSpot, WhatsApp, voice) live outside this repo and ship via the SDK.

## 12. Out of scope (v0)

- multi-tenant SaaS with shared deployments,
- runtime plugin installation, plugin marketplace, hot-loadable adapters, out-of-process / sidecar modules,
- a public REST/GraphQL API for third-party app developers (distinct from the integration SDK),
- runtime prompt management (experimentation UI, A/B comparisons, runtime prompt edits),
- automatic table or storage cleanup on module uninstall,
- merging tool results across multiple providers of the same capability per agent,
- model fine-tuning as a learning mechanism,
- ERP write-back of orders or invoices,
- microservice decomposition.

## 13. Short version

A small, opinionated **core** owns the offer lifecycle, canonical state, and the **named agents** that run AI work. Around it, **four extension surfaces** — inputs, enrichment, renderers, channels — and a **typed validation rule registry**. Cross-cutting integration uses **observer events** with no mutation rights. Pre-acceptance state changes go through the rule registry. Agent failures are first-class transitions with declared fallback modes. Modules can own any tables and storage namespace they need but cannot write canonical tables — they call core services instead. Single-tenant per deployment, no runtime isolation between modules and the core, growing by adding modules — not by rearchitecting the core.
