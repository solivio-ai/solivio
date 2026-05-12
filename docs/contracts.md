# Solivio Contracts

Status: **draft — partial** — full freeze comes once canonical persistence, pipeline semantics, and `services.*` APIs are specified here.
Last updated: 2026-05-12

Audience: contributors, integrators.

This file describes the **contract between the Solivio core and modules**. Right now the **implemented slice** is [`@solivio/sdk`](../sdk/): manifests and three capability surfaces. Broader topics (canonical DB schemas, pipeline transitions, core service handles, FK policy, validation taxonomy) stay **deferred**; see [`architecture.md`](architecture.md) for intent.

---

## `@solivio/sdk` package

| | |
| --- | --- |
| **Package name** | `@solivio/sdk` |
| **Location** | [`sdk/`](../sdk/) at repo root |
| **Entry** | Published/consumed as `./dist/index.js` + `./dist/index.d.ts`; source under [`sdk/src/`](../sdk/src/) |
| **Runtime dependency** | [`zod`](https://github.com/colinhacks/zod) — required for `AgentTool` parameter and output schemas |

**Monorepo usage**

- Listed as a Yarn workspace in the root [`package.json`](../package.json) (`"sdk"`).
- The app depends on it via `"@solivio/sdk": "workspace:*"` in [`apps/solivio/package.json`](../apps/solivio/package.json).
- TypeScript resolves `@solivio/sdk` to source for local development: [`apps/solivio/tsconfig.json`](../apps/solivio/tsconfig.json) maps `@solivio/sdk` → `../../sdk/src/index.ts` and includes `../../sdk/src/**/*.ts`.

**Build / publish**

- `yarn workspace @solivio/sdk build` runs `tsc -p tsconfig.build.json` and emits `sdk/dist/` (see [`sdk/package.json`](../sdk/package.json)).
- External consumers install `@solivio/sdk` from npm once published; they must depend on a compatible Zod v4.

---

## Public exports

Authoritative list: [`sdk/src/index.ts`](../sdk/src/index.ts).

| Export | Kind | Role |
| --- | --- | --- |
| `createModule` | function | Wraps a manifest for a stable default export |
| `ModuleManifest` | type | Root shape every module provides |
| `AgentTool` | type | Zod-typed tool callable by agents |
| `ImporterDefinition`, `ImportResult`, `ImportStatus` | types | Product CSV-style import surface |
| `RendererDefinition` | type | Offer snapshot → binary artifact |
| `ProductInput` | type | Write DTO for products produced by importers |
| `OfferSnapshot`, `OfferSnapshotLineItem` | types | Input DTO for renderers |

---

## Where modules live

First-party modules are implemented under **`apps/solivio/src/server/modules/`**.

Convention (see stub [`apps/solivio/src/server/modules/registry.ts`](../apps/solivio/src/server/modules/registry.ts)):

- One folder per module id, e.g. `apps/solivio/src/server/modules/csv-products/index.ts`.
- **`export default createModule({ … })`** — the core will aggregate these once wiring exists.
- Register each module in `registry.ts` (e.g. `import csvProducts from "./csv-products"` into `registeredModules`). At bootstrap, validate ids and unique tool names; `ModuleManifest` is TS-only in the SDK until you add a runtime schema.
- Modules must not import each other; use `@solivio/sdk`, `zod`, `@solivio/domain`, and core-exposed helpers — not cross-module imports.

Module loading / registration in the running app is **not implemented yet**; `registeredModules` is empty until the first module is wired.

---

## `ModuleManifest`

Defined in [`sdk/src/module.ts`](../sdk/src/module.ts).

| Field | Required | Description |
| --- | --- | --- |
| `id` | yes | Kebab-case stable id; unique per deployment; namespace for `mod_<id>_` tables and `mod_<id>/` storage |
| `name` | yes | Human-readable name |
| `version` | yes | Semver string |
| `agentTools` | no | `AgentTool[]` registered with the agent runtime |
| `importers` | no | `ImporterDefinition[]` for raw → `ProductInput[]` transforms |
| `renderers` | no | `RendererDefinition[]` for `OfferSnapshot` → bytes |

**Minimal module** (optional arrays omitted):

```ts
import { createModule } from "@solivio/sdk";

export default createModule({
  id: "csv-products",
  name: "CSV Products",
  version: "0.1.0",
});
```

---

## Capability surfaces (implemented)

### Agent tools — [`sdk/src/agent-tool.ts`](../sdk/src/agent-tool.ts)

Shape matches Voltagent-style tool options: **`name`**, **`description`**, **`parameters`** (Zod), **`outputSchema`** (Zod), **`execute`** (`z.infer<TParams>` → `Promise<z.infer<TOutput>>`). Tool names must stay unique across all registered tools in a deployment.

### Importers — [`sdk/src/importer.ts`](../sdk/src/importer.ts)

- **`ImporterDefinition<TPayload>`**: **`name`**, **`description`**, **`run(payload)`** → **`ImportResult`**.
- **`ImportResult`**: **`status`** (`success` | `partial` | `failed`), **`records`**: **`ProductInput[]`**, **`errors`**: `{ index?, sku?, message }[]`.
- Importers do **not** write the database; they return rows for the core to persist.

**`ProductInput`** — [`sdk/src/entities/product.ts`](../sdk/src/entities/product.ts): `sku`, `name`, `description`, `manufacturer`, `priceNet`, optional `priceGross` / `vatRate`, `currency`. Omits DB-generated fields (`id`, `createdAt`, embeddings).

### Renderers — [`sdk/src/renderer.ts`](../sdk/src/renderer.ts)

- **`RendererDefinition`**: **`name`**, **`format`**, **`mimeType`**, **`render(snapshot)`** → **`Promise<Uint8Array>`**.
- **`OfferSnapshot`** — [`sdk/src/entities/offer.ts`](../sdk/src/entities/offer.ts): offer-level metadata (`id`, `number`, `name`, customer text, `discountPercent`, `currency`, `issueDate`, optional `validUntil`, `notes`) plus **`lineItems`** (`OfferSnapshotLineItem`: ids, sku, name, optional `description`, quantities, prices, `vatRate`, `currency`, `rationale`, `position`).

---

## Deferred contract topics (not in the SDK yet)

These remain specified only at the architecture level until concrete signatures land here:

- Canonical entity schemas and Drizzle columns (de facto: [`apps/solivio/src/server/database/schema.ts`](../apps/solivio/src/server/database/schema.ts)).
- Named pipeline transitions, pre/postconditions, observer payloads.
- **`services.*`** handles modules call for canonical writes (`services.products.import`, `services.offers.transition`, …).
- Capability tags (tool vs always-loaded), module FK/cascade policy, validation rule types (`PriceRule`, …).

See [`architecture.md`](architecture.md) §3–9.
