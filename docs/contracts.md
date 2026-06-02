# Solivio Contracts

Status: **draft — partial** — full freeze comes once canonical persistence, pipeline semantics, and the complete `services.*` surface are specified here.
Last updated: 2026-05-29

Audience: contributors, integrators.

This file describes the **contract between the Solivio core and modules** as implemented in [`@solivio/sdk`](../sdk/): how a module is defined, what the core hands it at boot, and the capability surfaces it can contribute. Broader topics (canonical DB schemas, pipeline transitions, the full validation taxonomy) stay **deferred**; see [`architecture.md`](architecture.md) for intent and [`module-system.md`](module-system.md) for the module-system design and rationale.

---

## `@solivio/sdk` package

| | |
| --- | --- |
| **Package name** | `@solivio/sdk` |
| **Location** | [`sdk/`](../sdk/) at repo root |
| **Entry** | Consumed as `./dist/index.js` + `./dist/index.d.ts`; source under [`sdk/src/`](../sdk/src/) |
| **Runtime dependency** | [`@standard-schema/spec`](https://github.com/standard-schema/standard-schema) — Standard Schema v1 typings for `AgentTool` **`parameters`** and module **`optionsSchema`** (use any conforming library, e.g. recent Zod) |

The SDK is **runtime-inert**: it exports only types and pure functions (`defineModule`, `defineAgentTool`, `createTestContext`). It holds no module-scoped state and no singletons, so a module may safely bundle its own copy. Everything stateful (logger, services, AI, events, config) reaches a module through the injected `ModuleContext` — never through SDK module scope.

**Monorepo usage**

- Listed as a Yarn workspace in the root [`package.json`](../package.json) (`"sdk"`).
- Modules depend on it via `"@solivio/sdk": "workspace:*"`.
- TypeScript resolves `@solivio/sdk` to source for local development: [`apps/solivio/tsconfig.json`](../apps/solivio/tsconfig.json) maps `@solivio/sdk` → `../../sdk/src/index.ts`. The app imports **only SDK types** (erased at build); module *values* (`defineModule`, …) are bundled into each module.

**Build / publish**

- `yarn workspace @solivio/sdk build` runs `tsc -p tsconfig.build.json` and emits `sdk/dist/`.
- External consumers install `@solivio/sdk` from npm once published; for agent tools and options they supply a **`StandardSchemaV1`**-compatible schema library as needed.

---

## Public exports

Authoritative list: [`sdk/src/index.ts`](../sdk/src/index.ts).

| Export | Kind | Role |
| --- | --- | --- |
| `defineModule` | function | Declares a module — the single entry point |
| `ModuleFactory`, `DefineModuleConfig`, `ModuleContributions` | types | Module factory shape, its config, and the capability bag `register` returns |
| `ModuleContext`, `Logger`, `ConfigResolver`, `AiClientFactory`, `EventBus` | types | The seam the core injects into `register` |
| `CoreServices`, `ProductService`, `OfferService` (+ `ProductSearchOptions`, `OfferLineItemInput`, `OfferMutationResult`, `OfferDeleteResult`, `BulkAddResult`, `BulkAddItemResult`) | types | Typed canonical service handles modules call |
| `AgentTool`, `defineAgentTool` | type + function | Standard Schema–typed tool callable by agents, and an inference helper |
| `ImporterDefinition`, `ImportResult`, `ImportStatus`, `ImportTarget` | types | Input surface: raw payload → normalized records |
| `RendererDefinition` | type | Output surface (reserved — not yet wired) |
| `EventSubscriber` | type | Observer-event subscriber (reserved — not yet wired) |
| `ProductInput`, `ProductMatch` | types | Product write DTO and search-result DTO |
| `OfferSnapshot`, `OfferSnapshotLineItem` | types | Immutable accepted-offer snapshot for renderers |
| `OfferView`, `OfferItemView` | types | Working-offer read DTOs returned by `services.offers.*` |
| `createTestContext`, `TestContextOverrides` | function + type | Build a stub `ModuleContext` to unit-test a module |

---

## Defining a module

A module is a **factory** created with `defineModule` — see [`sdk/src/define-module.ts`](../sdk/src/define-module.ts). Its default export is the factory; the core calls `register(ctx, options)` once at boot and collects the returned `ModuleContributions`.

```ts
import { defineModule } from "@solivio/sdk";

import { createOfferTools } from "./tools.js";

export default defineModule({
  id: "offer-tools", // kebab-case; unique per deployment; table/storage namespace
  name: "Offer Tools",
  version: "0.1.0",
  // optionsSchema?: a StandardSchemaV1 (e.g. Zod) — omit for an options-free module
  register(ctx) {
    return { agentTools: createOfferTools(ctx.services) };
  },
});
```

`ModuleContributions` ([`define-module.ts`](../sdk/src/define-module.ts)) — each field is a capability kind:

| Field | Status | Description |
| --- | --- | --- |
| `agentTools` | implemented | `AgentTool[]` registered with the agent runtime |
| `importers` | implemented | `ImporterDefinition[]` for raw → records transforms |
| `renderers` | reserved | `RendererDefinition[]` — typed, not yet consumed by the core |
| `eventSubscribers` | reserved | `EventSubscriber[]` — typed, not yet consumed by the core |

Modules must not import each other or the app (`@/server/*`). They use `@solivio/sdk`, a Standard Schema–compatible schema library if they define tools/options, and `@solivio/domain` types.

### `ModuleContext` — the seam

[`sdk/src/module-context.ts`](../sdk/src/module-context.ts). The only path to shared infrastructure; a module reaches for nothing else.

| Field | Description |
| --- | --- |
| `logger` | Structured logger pre-tagged with the module id |
| `config` | Namespaced config/secret resolver (`get` / `require`) |
| `ai` | AI model-id factory (`chatModelId` / `embeddingModelId`) |
| `services` | Typed `CoreServices` handles — the only path to canonical state |
| `events` | Subscribe-only pipeline event bus (reserved alongside `eventSubscribers`) |

Reserved context fields from [`architecture.md`](architecture.md) §5 (`db`, `storage`, `jobs`, `i18n`, `agents`) are added in later phases.

---

## Canonical core services

[`sdk/src/services.ts`](../sdk/src/services.ts). Modules **never** write canonical tables directly; they read and request changes through these handles. The SDK declares the interfaces; the core supplies the implementation ([`apps/solivio/src/server/modules/coreServices.ts`](../apps/solivio/src/server/modules/coreServices.ts)).

- **`CoreServices.products`** — `search(query, opts)` → `ProductMatch[]`, `searchBatch(queries, opts)` → `Record<query, ProductMatch[]>`, `import(records)` → `{ count }` (the core owns dedup, embedding, and pricing).
- **`CoreServices.offers`** — `addProduct`, `updateLineItem` → `OfferMutationResult` (`ok` with `OfferView` | `not_found` | `locked` | `duplicate`); `removeLineItem` → `OfferDeleteResult`; `bulkAddProducts` → `BulkAddResult`.

The set grows with the pipeline; additive growth does not break existing modules.

---

## Capability surfaces

### Agent tools — [`sdk/src/agent-tool.ts`](../sdk/src/agent-tool.ts)

Framework-agnostic shape: **`name`**, **`description`**, **`parameters`** ([`StandardSchemaV1`](https://standardschema.dev)), optional **`outputSchema`**, **`execute`** (`StandardSchemaV1.InferOutput<TParams>` → `Promise<unknown>`). Use **`defineAgentTool`** to infer `execute`'s input type from `parameters`. The core adapts these to its agent-flow framework at wiring time, so tools never import it. Tool names must be unique across all registered tools in a deployment.

### Importers — [`sdk/src/importer.ts`](../sdk/src/importer.ts)

- **`ImporterDefinition<TPayload, TRecord>`**: **`name`**, **`description`**, **`target`** (`ImportTarget`, e.g. `"product"` — selects the core service that persists the records), **`accept`** (`string[]` for the HTML `<input accept>`), **`run(payload)`** → **`ImportResult<TRecord>`**.
- **`ImportResult`**: **`status`** (`success` | `partial` | `failed`), **`records`** (`TRecord[]`), **`errors`** (`{ index?, sku?, message }[]`).
- Importers do **not** write the database; they return rows and the core persists via `services[target].import`.

**`ProductInput`** — [`sdk/src/entities/product.ts`](../sdk/src/entities/product.ts): `sku`, `name`, `description`, `priceNet`, `priceGross`, `vatRate`, `currency`. Omits DB-generated fields (`id`, `createdAt`, embeddings).

### Renderers (reserved) — [`sdk/src/renderer.ts`](../sdk/src/renderer.ts)

- **`RendererDefinition`**: **`name`**, **`format`**, **`mimeType`**, **`render(snapshot)`** → **`Promise<Uint8Array>`**.
- **`OfferSnapshot`** — [`sdk/src/entities/offer.ts`](../sdk/src/entities/offer.ts): offer-level metadata plus **`lineItems`** (`OfferSnapshotLineItem`). The immutable accepted snapshot; distinct from the working-offer `OfferView`.

---

## Where modules live and how they load

First-party modules are workspace packages under **`modules/`** — e.g. [`modules/csv-products-importer/`](../modules/csv-products-importer/) (importer) and [`modules/offer-tools/`](../modules/offer-tools/) (agent tools). Mirror either as a template: `src/index.ts` (default export `defineModule({...})`), `package.json`, `tsconfig.json`.

- **Build:** `yarn modules:build` builds the SDK, then bundles each `modules/*` package into a **self-contained ESM bundle** at `modules-dist/<package>/index.mjs` (esbuild; deps and the SDK inlined). See [`scripts/bundle-modules.mjs`](../scripts/bundle-modules.mjs).
- **Load:** at startup the core's registry ([`apps/solivio/src/server/modules/registry.ts`](../apps/solivio/src/server/modules/registry.ts)) resolves each configured module to its bundle under `SOLIVIO_MODULES_DIR` (default: repo `modules-dist/`) and imports it **by file URL** — outside the app bundler, so modules load **without rebuilding the app**.
- **Enable:** list modules in [`solivio.config.json`](../solivio.config.json):

  ```jsonc
  {
    "modules": [
      { "package": "@solivio/module-csv-products", "options": {} },
      { "package": "@solivio/module-offer-tools", "options": {} }
    ],
    "slots": { "product.importer": "csv-products/csv-products" } // "<moduleId>/<importerName>"
  }
  ```

  `modules[]` is the single source of truth. `slots` binds an exclusive capability (e.g. the active product importer) to one provider; additive capabilities (agent tools) are all registered. At boot the registry validates unique module ids, unique tool/importer names, and that slot bindings resolve. Operators add external modules by dropping their pre-built bundles into `SOLIVIO_MODULES_DIR` and adding a config entry — no app rebuild.

---

## Testing a module

[`sdk/src/testing.ts`](../sdk/src/testing.ts): `createTestContext(overrides?)` builds a `ModuleContext` backed by no-op/stub infrastructure, so a module's `register` (and the capabilities it returns) can be unit-tested in isolation. Override `services`, `config`, `ai`, `logger`, or `events` as needed.

---

## Deferred contract topics

Specified only at the architecture level until concrete signatures land here:

- Canonical entity schemas and Drizzle columns (de facto: [`apps/solivio/src/server/database/schema.ts`](../apps/solivio/src/server/database/schema.ts)).
- Named pipeline transitions, pre/postconditions, and observer-event payloads (which wire the reserved `eventSubscribers`).
- Remaining `services.*` handles beyond `products` / `offers`.
- Renderer wiring, module-owned persistence (`mod_<id>_` tables, a scoped DB handle), validation rule types (`PriceRule`, …), capability tags (tool vs always-loaded), and an explicit module ABI version gate.

See [`architecture.md`](architecture.md) §3–9 and [`module-system.md`](module-system.md).
