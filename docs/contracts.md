# Solivio Contracts — the `@solivio/sdk` surface

Status: implemented — describes the contract between the core and modules as shipped
Audience: contributors, integrators
Last updated: 2026-06-10

This file describes the **contract between the Solivio core and modules**: the
`@solivio/sdk` package, what a module may import, and the merging contracts that make
cross-module calls typed. The system mechanics live in `module-system.md`; what the
generator does with these files in `codegen.md`.

---

## The `@solivio/sdk` package

| | |
| --- | --- |
| **Package name** | `@solivio/sdk` |
| **Location** | [`sdk/`](../sdk/) at repo root (workspace; modules depend on `"@solivio/sdk": "workspace:*"`) |
| **Distribution** | Consumed **as TypeScript source** — `exports` map straight to `src/*.ts`; the app build transpiles it together with the modules |
| **Runtime dependency** | `@standard-schema/spec` (Standard Schema v1 typings for `optionsSchema` and `AgentTool.parameters`) |
| **Optional peers** | `drizzle-orm` (for `/db` and `getDb`), `react` (for the UI contribution types), `zod` (for `/contracts`) |

### Entry points

| Specifier | Contents |
| --- | --- |
| `@solivio/sdk` | Module-definition types and helpers (below) — safe in any file, including client components |
| `@solivio/sdk/runtime` | **Server-only** runtime accessors — the only path to shared infrastructure |
| `@solivio/sdk/config` | `defineConfig` / `SolivioConfig` for the root `solivio.config.ts` |
| `@solivio/sdk/contracts` | OpenAPI contract vocabulary: `ApiContract`, `routeGroup`, `apiTags`, shared error/response schemas, `pdfResponse`, `sseResponse` |
| `@solivio/sdk/db` | Shared Drizzle column helpers for module tables (currently `timestamps`) |

### `@solivio/sdk` (root) exports

- `defineModule` / `ModuleManifest` — the manifest a module's `src/index.ts`
  default-exports: `{ id, title, version, description?, optionsSchema?, dependsOn?,
  routeGroup? }`. Capabilities are **not** listed in the manifest — the generator
  discovers them from the file layout.
- `defineSubscriber` / `SubscriberDefinition` — one per file under `src/subscribers/`;
  `persistent: true` delivers via the job queue (at-least-once), otherwise in-process.
- `defineJob` / `JobDefinition` — one per file under `src/jobs/`; `name` must be
  `<moduleId>.`-prefixed; `schedule` is a cron string or a function resolved at boot.
- `defineAgentTool` / `AgentTool` — framework-agnostic tool shape (`name`,
  `description`, Standard-Schema `parameters`, `execute`); agents adapt them to their
  flow framework at the consumption boundary.
- Importer types — `ImporterDefinition` (`name`, `description`, `target`, `accept`,
  `run`), `ImportResult`, `ImportRowError`, `ImportStatus`, `ImportTarget`
  (`"product" | "customer"`), plus `ProductImporterDefinition` /
  `CustomerImporterDefinition` and the entity DTOs `ProductInput`, `CustomerInput`,
  `ProductMatch`.
- Registry types — `Services`, `Events`, `ServiceName`, `EventName`,
  `CoreUsersService` (see merging contract below).
- Infrastructure types — `Logger`, `AiClientFactory`.
- UI contribution types — `NavEntry`, `SlotContribution`, `SlotContributions`,
  `SlotId`, `SlotPropsMap`.

### `@solivio/sdk/runtime` exports

Accessors over the runtime the host initializes once at boot
(`instrumentation.ts` → `bootModuleRuntime()` → `setRuntime`); the store lives on
`globalThis` under a well-known symbol so it survives multiple bundler instantiations
of the SDK. Calling any accessor before boot throws.

`getService(name)`, `getLogger(moduleId)`, `getDb()` and the lazy `db` proxy,
`getAi()`, `getAuth()` (`requireAuth`/`requireAdmin` guards returning
`{ session } | { response }`), `getAgentTools()`, `getImporter(target)`,
`getModuleOptions(moduleId)`, `emitEvent(name, payload)`, `enqueueJob(name, payload?)`.
Types: `SolivioRuntime`, `SessionUser`, `AuthSession`, `GuardResult`, `AuthGuards`.
`setRuntime` is host-only — modules never call it.

Do not call accessors at module-import time; the runtime exists only after
instrumentation boot. The `db` proxy is the sanctioned way to have a module-level
database constant.

## What modules may import

Enforced by `scripts/check-boundaries.mts` (part of `yarn check`):

| Allowed | Notes |
| --- | --- |
| `@solivio/sdk`, `@solivio/sdk/*` | The contract surface |
| `@solivio/ui` | Shared shadcn/ui kit (`@solivio/ui/components/<name>.tsx`) |
| `@solivio/theme` | Design tokens |
| `@solivio/domain` | Shared domain types, constants, fixtures |
| `@solivio/slots` | The generated `Slot` host component — an alias to `apps/solivio/src/generated/slots.tsx`, the only generated file modules may import |
| Own npm dependencies | Declared in the module's `package.json` (zod, drizzle-orm, voltagent, …) |
| Itself | Relative imports within `src/` |

Forbidden: other modules (`@solivio/module-*`), app internals (`@/...`,
`@solivio/app`), any other `@solivio/*` package.

**The one sanctioned exception** — a *type-only* import of a dependency module's
`services.ts`, which pulls that module's `Services` augmentation into a standalone
typecheck and is erased at runtime:

```ts
import type {} from "@solivio/module-offers/services.ts";
```

Runtime calls still go through `getService()`. The boundary checker recognizes exactly
this form.

## The Services / Events merging contract

`Services` and `Events` are **open interfaces** in `sdk/src/registries.ts`, filled in
by modules through TypeScript declaration merging:

```ts
// modules/catalog/src/services.ts
declare module "@solivio/sdk" {
  interface Services {
    catalog: CatalogService;
  }
}
export const services = { catalog: (_deps: Services) => createCatalogService() };
```

```ts
// modules/products-sync/src/events.ts
import type {} from "@solivio/sdk"; // keeps the file a module so the declaration AUGMENTS
declare module "@solivio/sdk" {
  interface Events {
    "products-sync.run.completed": { runId: string; imported: number };
  }
}
```

The generated registries import these files, pulling the augmentations into the app
program — `getService("catalog")` and `emitEvent("products-sync.run.completed", …)` are
then fully typed. Rules:

- a module declares services/events only under its own names (`<moduleId>` /
  `<moduleId>.<entity>.<action>`);
- service factories are lazy and memoized; they receive the container itself as `deps`;
- the service interface is the module's **public API** — everything in `src/server/` is
  module-private and may change without notice.

**Host-provided services.** The core registers services into the same container for
core-owned domains. Today: `users` — `CoreUsersService` with
`findDisplayByIds(ids): Promise<Array<{ id; name }>>` — so modules can resolve id-only
`user_id` references without touching the core-owned `users` table.

## What is stable, what is not

**Stable (the contract):** the SDK entry points and exports above, the file conventions
the generator discovers (`module-system.md` §2), the `solivio.config.ts` shape, the
declaration-merging pattern, the boundary rules, and each module's published service
interface in its `services.ts`.

**Not stable (do not depend on):**

- anything under `apps/solivio/src/` — app internals, including `@/generated/*`
  (modules see only the `@solivio/slots` alias);
- the shape of generated artifacts (`codegen.md` documents them for contributors to the
  generator, not as an API);
- other modules' internals (`src/server/`, components, repositories) and their tables —
  reference rows by id, fetch display data through services;
- the agent implementations inside modules (`agents.md`) and the core's model-routing
  internals — `getAi().modelFor(role)` is the contract;
- `SolivioRuntime`'s internals / `setRuntime` — host-only.

Additive growth of `Services`, `Events`, slot ids in `SlotPropsMap`, and import targets
does not break existing modules. Changing or removing any of the stable surface is an
**Ask First** item (root `AGENTS.md`).
