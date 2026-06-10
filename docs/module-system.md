# Solivio Module System

Status: **implemented** — build-time codegen modular monolith (see `adr/0002-build-time-module-codegen.md`)
Audience: contributors, integrators
Last updated: 2026-06-10

Solivio is a **modular monolith wired by build-time code generation**. A module is a
TypeScript source package under `modules/<id>/`; the generator (`yarn generate`, source in
`scripts/generate/`) reads `solivio.config.ts`, discovers each enabled module's
capabilities **by file convention**, validates the module graph, and emits the wiring the
app builds against. There is no runtime module loading and no per-module build step: the
Next.js build compiles module sources directly (they are `transpilePackages`).

This document is the authoritative description of that system. The generator's emitted
artifacts are catalogued in `codegen.md`; the public SDK surface in `contracts.md`; the
per-module database model in `database.md`.

---

## 1. The model in one picture

```
solivio.config.ts            modules/<id>/src/**            (file conventions)
        │                            │
        └────────► yarn generate ◄───┘        scripts/generate/{config,discover,validate,emit/*}
                        │
        ┌───────────────┼─────────────────────────────────────────┐
        ▼               ▼                                         ▼
apps/solivio/src/   apps/solivio/src/app/(protected)/(gen)/   apps/solivio/src/generated/db/
generated/          apps/solivio/src/app/(gen-public)/        (per-module drizzle configs +
(registries, i18n,  apps/solivio/src/app/api/(gen)/            migration manifest)
 tailwind sources)  (page + route stubs)
        │                       │
        ▼                       ▼
instrumentation.ts ─► bootModuleRuntime() ─► setRuntime(...)   Next.js app router
        │
        ▼
module code at request time: getService() / getDb() / getAuth() / emitEvent() / …
```

All four output trees are **generator-owned and gitignored** — never edit or commit them.

## 2. A module

A module is a workspace package `modules/<id>/` (package name `@solivio/module-<id>`)
whose `package.json` carries the marker:

```jsonc
{
  "name": "@solivio/module-products-sync",
  "solivio": { "module": true },
  "exports": { ".": "./src/index.ts", "./*": "./src/*" }
}
```

`src/index.ts` default-exports the **manifest** — identity only, no capability list:

```ts
import { defineModule } from "@solivio/sdk";

export default defineModule({
  id: "products-sync",          // kebab-case; must equal the directory name for in-tree modules
  title: "Products Sync",
  version: "0.1.0",
  optionsSchema,                 // optional Standard Schema (zod, …) validating config options at generate time
  dependsOn: ["catalog"],       // ids of modules whose services/events this module consumes
  // routeGroup: "public"       // pages outside the session guard; default "protected"
});
```

Everything else is discovered from the conventional layout. All parts are optional:

| Path | Capability |
|------|-----------|
| `src/services.ts` | Public service factories (`export const services`) + `Services` declaration merge |
| `src/events.ts` | `Events` declaration merge (typed event map) |
| `src/data/schema.ts` | Module-owned Drizzle tables |
| `src/data/migrations/` | The module's own Drizzle journal (committed) |
| `src/api/<path>/route.ts` | HTTP route at `/api/<path>` |
| `src/pages/<path>/page.tsx` | Page at `/<path>` (`page.tsx` directly in `pages/` = the module owns `/`); `layout`, `loading`, `error`, `not-found`, `default`, `template` work too |
| `src/components/` | Module-private React components |
| `src/subscribers/*.ts` | One `defineSubscriber` default export per file |
| `src/jobs/*.ts` | One `defineJob` default export per file |
| `src/ai/tools.ts` | `export const tools: AgentTool[]` |
| `src/ai/importers.ts` | `export const importers: AnyImporterDefinition[]` |
| `src/contracts/routes.ts` | `export const routes: ApiContract[]` (OpenAPI) |
| `src/i18n/<locale>.json` | Messages, merged under the `<moduleId>` namespace |
| `src/nav.tsx` | `export const nav: NavEntry[]` (client-safe: icons + data only) |
| `src/slots.tsx` | `export const slots: SlotContributions` |
| `src/acl.ts` | `export const permissions` (each `<moduleId>.`-prefixed) |
| `AGENTS.md` | The module's working notes for agents/contributors |

`modules/products-sync/` is the reference example — it exercises every surface: options
schema, an own prefixed table with a real (non-adoption) migration, a cron-schedulable
job, an event, an admin API route, an admin page with nav entry, ACL permissions, and
i18n. `modules/customers/` is the simplest full-stack module; `modules/csv-import/` is a
headless capability-only module (importers, no tables/routes/pages).

## 3. Enabling modules — `solivio.config.ts`

The root `solivio.config.ts` is the single source of truth for which modules a
deployment enables. It is read **at generate time only**, never at runtime:

```ts
import { defineConfig } from "@solivio/sdk/config";

export default defineConfig({
  modules: ["catalog", "customers", "offers", "offer-chat", "csv-import", "products-sync"],
  slots: {
    "product.importer": "csv-import/csv-products",
    "customer.importer": "csv-import/csv-customers",
  },
});
```

- An entry is an in-tree directory name (`modules/<id>`) or an npm package name for
  out-of-tree modules; `[ref, { ...options }]` passes options, validated against the
  module's `optionsSchema` at generate time and exposed at runtime via
  `getModuleOptions(moduleId)`.
- `slots` binds **exclusive capabilities** (`"<moduleId>/<capabilityName>"`). Today the
  importer targets are the only slotted capabilities; when exactly one provider exists
  for a target, the binding is optional.
- Changing this file requires `yarn generate` and a rebuild/restart — enabling a module
  is a **config + rebuild** operation, not a runtime one.

**Out-of-tree modules:** publish the module as an npm package with the same layout
(`src/index.ts` manifest, conventional files, `"solivio": { "module": true }`), install
it as a dependency, and list its package name in `solivio.config.ts`. The generator
resolves it through `require.resolve` and treats it exactly like an in-tree module.

## 4. What the generator emits and how it reaches the app

`yarn generate` (details and full artifact table: `codegen.md`) emits:

- **Registries** under `apps/solivio/src/generated/`: services, events/subscribers,
  jobs, AI tools + importers, nav, slots, ACL permissions, OpenAPI contracts, module
  metadata + options + slot bindings, a merged schema re-export, merged i18n messages,
  a Tailwind `@source` list, `next-modules.json` (for `transpilePackages`), and
  `public-routes.json` (for the session proxy).
- **App-router stubs** under `apps/solivio/src/app/(protected)/(gen)/`,
  `(gen-public)/`, and `api/(gen)/` — one tiny file per module page/route that
  re-exports the module's component/handlers.
- **Per-module DB wiring** under `apps/solivio/src/generated/db/` — a drizzle-kit
  config per schema-owning module, a migration manifest for the runner, and a studio
  config spanning all schemas.

### Stub mechanics

A page stub is a re-export, which is what lets module files live outside `app/` while
Next.js file-based routing still finds them:

```ts
// apps/solivio/src/app/(protected)/(gen)/offers/new/page.tsx  (generated)
export { default, metadata } from "@solivio/module-offers/pages/offers/new/page.tsx";
```

One constraint discovered by spike (recorded in `adr/0002`): **Next.js route segment
config cannot be re-exported.** Next statically parses `export const dynamic = ...`,
`runtime`, `maxDuration`, etc., and rejects re-exports. The generator therefore scans
the module source for segment-config exports and **inlines the literal values** into the
stub while re-exporting everything else (handlers, `default`, `metadata`,
`generateMetadata`, `generateStaticParams`, …). Consequence for module authors: segment
config values must be literals on a single line, not computed expressions.

Pages of `routeGroup: "protected"` modules land inside `(protected)/(gen)` — behind the
session guard and inside the app shell. Pages under a module's `pages/admin/**` get the
app's admin guard layout re-exported into the generated subtree. `routeGroup: "public"`
modules land in `(gen-public)` and their URLs are written to
`generated/public-routes.json`, which `apps/solivio/src/proxy.ts` consults so the
session proxy lets them through without a cookie (dynamic `[param]` segments are matched
by pattern).

### Slots and `@solivio/slots`

Core or module surfaces render `<Slot id="..." />`; other modules fill the slot via
`src/slots.tsx`. The generated `generated/slots.tsx` merges contributions (ordered by
`order`) and exports the `Slot` host component. Core code imports it as
`@/generated/slots`; **module pages import it as `@solivio/slots`** — an alias defined
in `next.config.mjs` (`turbopack.resolveAlias`) and `apps/solivio/tsconfig.json`
(`paths`), and the only generated file modules may import. Slot ids and their props are
declared in `sdk/src/ui/slots.ts` (`SlotPropsMap`); current ids: `dashboard.cards`,
`offer-detail.panel`, `import.panel`. The offers dashboard hosts `dashboard.cards`.

## 5. Services — the cross-module call path

A module's public API is its **service**, declared in `src/services.ts`:

```ts
export interface CustomersService { findById(id: string): Promise<CustomerRow | null>; /* … */ }

declare module "@solivio/sdk" {
  interface Services {
    customers: CustomersService;   // declaration merging into the open SDK registry
  }
}

export const services = {
  customers: (_deps: Services) => createCustomersService(),
};
```

The generated `generated/services.ts` imports every enabled module's `services.ts`
(which pulls the declaration merges into the program, making `getService("customers")`
fully typed) and builds a **lazy, memoizing container**: factories run on first access
and receive the container itself as `deps`. The host registers core-provided services
into the same container at boot — today `users` (`CoreUsersService`,
`apps/solivio/src/server/runtime/usersService.ts`), exposing minimal display data for
the core-owned `users` table so modules can resolve id-only `user_id` references.

Consumers call `getService("customers")` from `@solivio/sdk/runtime` — never import the
providing module. For a **standalone module typecheck** to see a dependency's `Services`
augmentation, the consuming module uses the one sanctioned cross-module import — type
only, erased at runtime:

```ts
// modules/offer-chat/src/service-deps.ts
import type {} from "@solivio/module-offers/services.ts";
```

The boundary checker (`scripts/check-boundaries.mts`) explicitly allows exactly this
form and rejects every other cross-module import.

**Why declaration merging, and why the type-only import?** TypeScript lets several
files re-open the same interface and add members ("declaration merging") — but an
augmentation only exists in a compilation that actually *includes* the file declaring
it. The SDK ships `Services` as an empty interface; each module's `services.ts` adds
its own key. In the app's typecheck this works automatically, because the generated
`services.ts` imports every enabled module's `services.ts`. A module's **standalone**
typecheck, however, only includes its own files — so without the type-only import
above, a dependency's key simply isn't on `Services`, and `getService("offers")`
fails with `not assignable to parameter of type 'never'` (or names a different,
unrelated service). If you see that error, the missing augmentation is almost always
the cause: add the `import type {}` line for the module you depend on.

Two related foot-guns the generator catches for you: a `declare module` block in a
file with **no imports or exports** is a *script*, and its declaration **replaces**
the SDK module type instead of augmenting it (this is why `events.ts` files start
with `import type {} from "@solivio/sdk"`); and calling `getService()` for a module
you haven't listed in `dependsOn` fails at generate time rather than at runtime when
that module is disabled.

## 6. Events, subscribers, and jobs

`src/events.ts` declares the module's typed events by augmenting the SDK's `Events`
interface; names follow `<moduleId>.<entity>.<action>` and a module may only declare
events under its own id prefix:

```ts
import type {} from "@solivio/sdk";   // keeps the file a module so the declaration AUGMENTS

declare module "@solivio/sdk" {
  interface Events {
    "offers.offer.created": { offerId: string };
  }
}
```

`emitEvent(name, payload)` (from `@solivio/sdk/runtime`) runs **non-persistent
subscribers inline** in-process (errors logged, never thrown into the emitter) and
enqueues **persistent subscribers** (`persistent: true`) on the pg-boss queue
(`subscriber:<id>`, at-least-once with retries). Subscribers live one per file under
`src/subscribers/`, default-exported via `defineSubscriber`.

Jobs live one per file under `src/jobs/`, default-exported via `defineJob`. A job name
must be `<moduleId>.`-prefixed. `schedule` may be a cron string or a **function resolved
at boot** — the runtime is initialized by then, so a module can derive the schedule from
its deployment options (`products-sync.run` does exactly this). Enqueue ad hoc with
`enqueueJob(name, payload)`. The engine (`apps/solivio/src/server/runtime/jobs.ts`) runs
pg-boss against the existing Postgres inside the Next server process; see
`adr/0004-jobs-events-on-pg-boss.md`.

## 7. Per-module database

Each module with a `src/data/schema.ts` owns its tables and its own migration journal
(`src/data/migrations/`, applied into its own `drizzle_migrations_<module>` table). New
tables must be named `<module_id>_*`; a fixed grandfathered list of pre-split tables
keeps unprefixed names. Cross-module references are **id-only columns without FK
constraints** — display data is fetched through batch service lookups, never SQL joins
on another module's tables. `yarn db:generate <moduleId>` diffs a module's schema
against its journal using the generated per-module drizzle config. Full model, commands,
and the adoption/detach recipe for moving tables: `database.md` and
`adr/0003-per-module-migrations.md`.

## 8. The runtime — `@solivio/sdk/runtime`

`instrumentation.ts` boots once per server process: `bootModuleRuntime()`
(`apps/solivio/src/server/runtime/boot.ts`) assembles the runtime from the generated
registries and core infrastructure, stores it on `globalThis` via `setRuntime()`, then
starts the job engine. Module code reaches shared infrastructure **exclusively** through
the accessors:

| Accessor | Provides |
|----------|----------|
| `getService(name)` | Typed handle to another module's (or the host's) service |
| `getDb()` / `db` | The shared Drizzle handle (`db` is a lazy proxy, safe to import before boot) |
| `getAuth()` | `requireAuth()` / `requireAdmin()` session guards for module API routes |
| `getAi()` | Deployment model ids: `chatModelId()`, `embeddingModelId()`, `modelFor(role)` |
| `getLogger(moduleId)` | Structured JSON logger tagged with the module id |
| `getImporter(target)` | The importer bound to a target via slot binding (or sole provider) |
| `getAgentTools()` | All agent tools contributed by enabled modules |
| `getModuleOptions(moduleId)` | The module's validated options from `solivio.config.ts` |
| `emitEvent(name, payload)` | Typed event emission (inline + queued subscribers) |
| `enqueueJob(name, payload?)` | Enqueue a background job |

Because the runtime exists only after instrumentation runs, module code must not touch
these accessors at import time — construct agents lazily (memoized factories inside
handlers), resolve services inside functions, and use the `db` proxy rather than calling
`getDb()` at module scope.

## 9. Boundary rules (enforced)

`yarn check` runs `scripts/check-boundaries.mts` in addition to Biome:

1. Module code may import: itself (relative), `@solivio/sdk*`, the shared packages
   (`@solivio/ui`, `@solivio/theme`, `@solivio/domain`), `@solivio/slots`, and its own
   npm dependencies. It may **not** import other modules (except the type-only
   `services.ts` form), app internals (`@/...`), or `@solivio/app`.
2. Handwritten app code may not import `@solivio/module-*` directly — module code
   reaches the app only through `@/generated/*` (generated files are exempt).

The generator's own validations (unique ids, acyclic `dependsOn`, route collisions,
table prefixes, permission prefixes, slot bindings) are listed in `codegen.md`.

## 10. Adding a module, step by step

1. `mkdir modules/<id>` with three files, mirroring `modules/products-sync/`:
   - `package.json` — name `@solivio/module-<id>`, `"solivio": { "module": true }`,
     `"exports": { ".": "./src/index.ts", "./*": "./src/*" }`, deps on
     `@solivio/sdk: workspace:*` (+ `@solivio/ui`, `zod`, … as needed).
   - `tsconfig.json` — extends `../../tsconfig.base.json` with
     `"allowImportingTsExtensions": true`; add a `typecheck` script so
     `yarn typecheck` (workspaces foreach) covers it.
   - `src/index.ts` — `export default defineModule({ id, title, version, ... })`.
2. Add the id to `modules` in `solivio.config.ts` (with options if it has an
   `optionsSchema`); bind a `slots` entry if it provides an exclusive capability with
   competitors.
3. Run `yarn generate` (or let the `yarn dev` watcher pick it up). Fix any validation
   errors it reports.
4. Add capability files as needed (table above). If it owns tables: write
   `src/data/schema.ts` with `<module_id>_`-prefixed names, run
   `yarn generate && yarn db:generate <id>`, review the SQL, `yarn db:migrate`.
5. Write the module's `AGENTS.md` (owned tables, public service surface, routes/pages,
   gotchas).
6. `yarn generate && yarn check && yarn typecheck` before handing back.

## 11. What stays core

`apps/solivio` keeps only what cannot be a module: authentication (better-auth) and the
`/admin/users` page, the app shell and sidebar (which render the generated nav
registry), the login page, `/api/health`, the runtime boot + jobs engine, the i18n
request plumbing, and the database client for core tables. Shared presentation lives in
packages: `@solivio/ui` (shadcn kit), `@solivio/theme` (tokens), `@solivio/domain`
(shared types/fixtures). Everything offer-shaped lives in modules.

One deliberate seam worth knowing: the offer review **chat panel UI lives in the offers
module** (it integrates imperatively with the review screen), while the **chat domain —
threads, messages, the copilot agent, and the streaming routes — lives in offer-chat**;
the panel talks to it over HTTP only. UI cohesion and domain ownership can be split when
HTTP is the boundary.

## 12. What this design trades away

The previous design (a runtime bundle loader reading `SOLIVIO_MODULES_DIR`) let
operators add modules to a fixed image without rebuilding. Build-time codegen
deliberately gives that up: module pages/routes, declaration-merged types, per-module
migrations, and one bundling model were worth more than no-rebuild installs. Operators
now compose a deployment by editing `solivio.config.ts` and building an image. The
rationale and alternatives are recorded in `adr/0002-build-time-module-codegen.md`.
