# Solivio Module System — Proposed Architecture

Status: **proposal** — supersedes the current static-manifest module registry once accepted
Audience: contributors, integrators
Last updated: 2026-05-29

This document proposes the long-term shape of Solivio's module/plugin system and the
`@solivio/sdk` contract. It refines `architecture.md` §3–§9 into concrete SDK types,
a registration lifecycle, a discovery/build model, and a migration path from the
current PoC. It does **not** reopen the runtime-framework question (`adr/0001`) — the
design assumes Next.js as the host and stays framework-agnostic where it can.

---

## 1. Why change

The current system works but won't scale to "many in-house modules + occasional
external modules." Concretely, today:

- **A module is static data.** `createModule({ id, name, version, importers, ... })`
  returns a plain manifest. A module has no lifecycle and no access to anything —
  no logger, no config, no DB, no core services. So *real* capabilities can't live in
  modules. The chat agent's tools (`apps/solivio/src/server/offers/offerLineItemTools.ts`)
  import `db` and services as in-app singletons. They are conceptually module
  contributions but are physically welded to the app.

- **Capability selection is a stringly-typed side-channel.** `solivio.config.json`
  has one hardcoded slot, `capabilities.productImporter: "csv-products"`, matched to an
  importer `name` at runtime in `registry.ts`. There is no general, typed slot model.

- **Enabling a module touches too many places.** `solivio.config.json` lists the
  package, `scripts/sync-modules.mjs` guards drift between `modules/` and that list,
  `next.config.mjs` keeps `@solivio/module-*` external, the registry does a dynamic
  `import(/* turbopackIgnore */ pkg)`, and the **Dockerfile hardcodes a `COPY` pair per
  module** into the runner stage. Adding the second module means editing the Dockerfile.

- **The importer is product-shaped only.** `ImportResult.records: ProductInput[]`. Its
  own source comment already anticipates clients/offers/requests.

There is prior intent in this direction: an **uncommitted `sdk/dist`** in the working
tree contains a richer, abandoned sketch — `defineModule({ optionsSchema, register(ctx,
options) → ModuleContributions })`, a `ModuleContext { logger }`, and a
`CAPABILITY_SLOTS` registry. This proposal picks that thread back up and finishes it.

## 2. What we looked at

We studied how established Node/TS extensible systems handle this, and took the parts
that fit a single-tenant, build-time, operator-shipped model (no marketplace, no runtime
install — see `architecture.md` §2).

| System | What we took | What we left |
| --- | --- | --- |
| **Medusa v2** | Module *isolation* (no cross-module imports, modules talk to the core, not each other); explicit registration in config; cross-domain wiring lives in the **application**, not inside domains. | The DML/auto-CRUD ORM abstraction, the `.medusa/server` build/`exports` gymnastics, per-module ORM containers, dual register mechanisms. |
| **Payload v3** | Plugins as **typed contributions composed at boot**; options validated per plugin; the "no-op when disabled" path. | The raw `config → config` spread-or-you-lose-data merge model — we use additive registries instead of hand-merging. |
| **Strapi v5** | An explicit **`register` / `bootstrap` lifecycle** with a clear "before vs after the world exists" split. | node_modules **auto-discovery** — it weakens determinism, auditability, and bundling, all of which we value more than zero-config install. |
| **Backstage** | **Typed extension points** + DI-resolved init: a plugin publishes a typed contract, others contribute into it, ordering falls out of the dependency graph. | The full DI/extension-point machinery — too heavy for v0; we keep the *idea* (typed capability registries) without the framework. |
| **open-mercato** | A thin **manifest + `register(container)`** module and a per-module convention layout; an **explicit enable list** plus codegen so authors don't hand-register every file. | Per-request Awilix containers and the very broad override surface — out of scope for v0. |

The throughline: **explicit enable list (determinism, security, predictable bundling)
+ a register function that receives a context and returns typed contributions
(capabilities can finally depend on the core) + codegen to remove the manual wiring
(no Dockerfile edits, no drift script).**

## 3. Decisions taken (with input)

1. **The app is shipped pre-built; operators never rebuild it.** Solivio ships as one
   fixed runtime artifact (the Docker image / Next standalone server). Operators extend a
   deployment by supplying **pre-built, self-contained module bundles** plus a **config
   file** — and nothing else is required to run. Modules are loaded **at startup** by
   dynamic `import()` from operator-controlled locations, not bundled into the app. This
   is load-at-startup, not a hot-reload marketplace (see §5.4 for the reconciliation with
   `architecture.md` §2/§12).
2. **Modules are distributed as bundled npm packages (ESM `.mjs`).** A module is an npm
   package that depends on `@solivio/sdk`, built into a single self-contained ESM bundle
   with its own dependencies inlined. The operator obtains the built bundle (npm, tarball,
   git, or our starter pack) and points the config at it. No runtime `npm install` is
   required to boot.
3. **Modules stay pure in v0; persistence is deferred.** Modules do not own DB tables or
   receive a raw DB handle yet. Capabilities request canonical reads/writes through
   typed **core service handles**. The `mod_<id>_` table-namespace convention and a
   scoped Drizzle handle are *reserved* for a later phase. (Matches "no migrations for
   now.")
4. **v0 formalizes two surfaces: importers and agent tools.** Renderers and observer
   event subscribers become *reserved capability kinds* — declared in the SDK types so
   the registry shape is stable, but not wired into the core pipeline yet.

These reshape `architecture.md` §2 ("operator-shipped code in the operator's image") and
§12 ("no runtime plugin installation"): operators no longer rebuild an image to add a
module — they drop pre-built bundles and edit config. That doc should be updated to
describe load-at-startup as the operator model once this proposal is accepted.

## 4. The model

Three layers, same as `architecture.md`, made concrete:

```
┌─────────────────────────────────────────────────────────────┐
│  CORE (apps/solivio)                                          │
│   • bootstrap: read config → build context → register modules │
│   • capability registries (tools, importers, [renderers],     │
│     [subscribers])  ── typed, frozen after boot               │
│   • CoreServices implementations (products, offers, …)        │
│   • named agents consume getAgentTools()                      │
└───────────────▲───────────────────────────┬──────────────────┘
                │ ModuleContext (handles)    │ ModuleContributions
                │                            ▼
┌───────────────┴───────────────────────────────────────────────┐
│  MODULE  (modules/* or @vendor/solivio-module-*)               │
│   defineModule({ id, optionsSchema, register(ctx, opts) {…} }) │
│   register returns { agentTools?, importers?, … }              │
│   depends ONLY on @solivio/sdk (types) — never on @/server/*   │
└────────────────────────────────────────────────────────────────┘
```

The single most important change: **a module is no longer data, it is a factory.**
`register(ctx, options)` is called once at boot. Because it receives `ctx`, a capability
can close over `ctx.services`, `ctx.logger`, `ctx.config`, `ctx.ai` — which is exactly
what lets the chat agent's tools move out of the app and into a module.

### 4.1 `defineModule`

```ts
// @solivio/sdk
export interface ModuleFactory<Options = unknown> {
  readonly id: string;        // kebab-case, unique per deployment; storage/table namespace
  readonly name: string;
  readonly version: string;   // semver
  parseOptions(raw: unknown): Options;
  register(
    ctx: ModuleContext,
    options: Options,
  ): ModuleContributions | Promise<ModuleContributions>;
}

export interface DefineModuleConfig<Schema extends StandardSchemaV1> {
  id: string;
  name: string;
  version: string;
  /** Standard Schema for this module's config options. Defaults to "no options". */
  optionsSchema?: Schema;
  register: (
    ctx: ModuleContext,
    options: StandardSchemaV1.InferOutput<Schema>,
  ) => ModuleContributions | Promise<ModuleContributions>;
}

export function defineModule<Schema extends StandardSchemaV1>(
  config: DefineModuleConfig<Schema>,
): ModuleFactory<StandardSchemaV1.InferOutput<Schema>>;
```

`defineModule` is the single way to declare a module. The old static-manifest
`createModule` is gone — a module with no options and no context need just returns its
capabilities from `register` directly.

### 4.2 `ModuleContributions`

A module returns a typed bag. Each field is a *capability kind*. v0 implements the first
two; the rest are reserved (typed, validated, but not yet consumed by the core).

```ts
export interface ModuleContributions {
  agentTools?: AgentTool[];          // ✅ v0
  importers?: ImporterDefinition[];  // ✅ v0
  renderers?: RendererDefinition[];  // 🔒 reserved
  eventSubscribers?: EventSubscriber[]; // 🔒 reserved
  // future: contextProviders, validationRules, promptFragments, inputs, channels
}
```

Reserved kinds ship as types now so the registry, config schema, and validation are
shaped correctly from day one — adding the wiring later is additive, not a breaking
change.

### 4.3 `ModuleContext` — the one seam

Per `architecture.md` §5, the context is the *only* path to shared infrastructure.
Start minimal and grow it; v0 carries what importers and agent tools actually need.

```ts
export interface ModuleContext {
  /** Structured logger pre-tagged with this module's id. */
  logger: Logger;
  /** Typed, namespaced config + secrets resolver for this module. */
  config: ConfigResolver;
  /** Factory for AI clients (tools/renderers that call models). */
  ai: AiClientFactory;
  /** Typed handles to canonical core services — the ONLY way to read/write canonical state. */
  services: CoreServices;
  /** Subscribe-only pipeline event bus (reserved alongside eventSubscribers). */
  events: EventBus;

  // 🔒 reserved, added when their phase lands:
  // db: ScopedDrizzle;        // module-owned tables (mod_<id>_*)
  // storage: StorageProvider; // mod_<id>/ namespace
  // jobs: JobQueue;
  // i18n: Translator;
  // agents: AgentInvoker;     // renderers/channels that internally call an agent
}
```

`CoreServices` is the contract that replaces today's direct singleton imports. The SDK
exports it **as interfaces only**; the core supplies the implementation at boot:

```ts
// @solivio/sdk — types only
export interface CoreServices {
  products: ProductService;
  offers: OfferService;
  // grows with the pipeline
}

export interface ProductService {
  search(query: string, opts?: SearchOptions): Promise<ProductMatch[]>;
  /** Importers return records; the core persists + embeds + dedups. */
  import(records: ProductInput[]): Promise<{ count: number }>;
}
```

This is the inversion that matters: `offerLineItemTools.ts` today does
`import { searchProductsByPrompt } from "../products/productSearchService"`. After this,
a module's tool does `ctx.services.products.search(query)`. The module compiles against
`@solivio/sdk` alone and never reaches into `@/server/*`.

### 4.4 Capability registries and slots

Two categories, both typed, replacing the single stringly slot:

- **Additive capabilities** — every contributed one is active. Agent tools and event
  subscribers are additive. Uniqueness is enforced at boot (tool names already are, in
  `registry.ts`).
- **Selected capabilities** — when several modules provide the same exclusive role, a
  **slot** in config names the active one. The product importer is the only slot in v0.

Slot binding moves from a free string to `"<moduleId>/<capabilityName>"`, validated at
boot against what was actually registered, and typed by kind:

```jsonc
// solivio.config.json — the only thing (besides the bundles) an operator provides
{
  "modules": [
    { "package": "@solivio/module-csv-products", "options": {} },
    { "package": "@acme/solivio-module-odoo", "options": { "baseUrl": "https://erp.acme" } }
  ],
  "slots": {
    "product.importer": "csv-products/csv"     // "<moduleId>/<capabilityName>"; resolves or boot fails
  }
}
```

Each `package` is resolved to a built bundle at startup (§5.1); `options` is validated
against that module's `optionsSchema`; `slots` bind exclusive capabilities.

If only one provider exists for a slot, it is the implicit default and the `slots` entry
is optional. This generalizes `getImporter()` without a hardcoded field per capability.

## 5. Discovery, loading, and the operator artifact

The operator goal — *pre-built modules + a config file is enough to run* — rules out
bundling modules into the app at build time. Modules are therefore loaded **at startup**
by dynamic `import()` from locations the operator controls, driven entirely by config.
This keeps the current `import(/* turbopackIgnore */ …)` approach (which already works in
the Next standalone server) and makes it operator-friendly.

### 5.1 Where modules live and how they resolve

A deployment has one or more **module roots** — directories the loader scans/resolves
against, highest priority first:

1. **Operator root** — `SOLIVIO_MODULES_DIR` (e.g. a mounted volume `/data/modules`).
   Operator-supplied bundles. Wins on conflict.
2. **Bundled starter pack** — `/app/modules.default` baked into the image (the first-party
   starter modules from §11 of `architecture.md`), so a stock image runs end-to-end with
   no operator modules at all.

Each root contains one directory per module package whose `package.json` `exports`/`main`
points at the built ESM entry (`dist/index.mjs`). The loader resolves
`<root>/<package>/package.json`, reads the entry, and imports it by **file URL**:

```ts
const url = pathToFileURL(resolveEntry(root, pkg)).href;
const mod = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url)) as {
  default: ModuleFactory;
};
```

Importing by file URL (not bare specifier) means the loader does **not** depend on Node
resolving the package from the app's `node_modules` — which is exactly why module bundles
must be **self-contained** (their own deps inlined). The app's bundling model never sees
them.

### 5.2 The module build target

A module is built — by us or a third party — into a self-contained ESM bundle:

- **Format:** ESM (`.mjs`), `"type": "module"`, single `dist/index.mjs` (+ `.d.ts` for
  authoring). Use `tsup`/`esbuild`/`rollup`.
- **Dependencies:** bundled (inlined). A module that needs an Odoo client or a PDF lib
  ships it inside the bundle. (Native `.node` addons can't be inlined — out of scope for
  v0's importers/tools; flag if one ever appears.)
- **`@solivio/sdk`:** bundled into the module too. This is safe **only because the SDK is
  runtime-inert** (§5.3) — there is no shared singleton to duplicate. Everything stateful
  arrives through `ctx`.
- **Manifest:** the bundle's default export is the `ModuleFactory`.

We provide a `create-solivio-module` scaffold and a documented build config so first- and
third-party authors produce identical, loadable artifacts.

### 5.3 The ABI — runtime-inert SDK now, explicit versioning later

Because a module is built independently and loaded into an app it was never linked
against, the **`ModuleContext` + `CoreServices` + capability types are the contract**
between them. One rule protects it today, and one is deferred:

- **(Now) The SDK is runtime-inert.** `@solivio/sdk` exports only types and pure functions
  (`defineModule` returns its config; validators are pure). It holds no module-scoped
  state, no singletons, no `instanceof`-based identity across the boundary. A module may
  safely bundle its own copy. *Anything stateful or shared is reached only through `ctx`.*
  This invariant is load-bearing — review must guard it.
- **(Deferred) An explicit version gate.** At PoC, with first-party modules built from the
  same repo, a runtime ABI-version check earns its keep only once modules ship out of band
  against a frozen SDK. When that day comes, stamp a version integer onto the factory and
  have the loader refuse mismatches with a clear error (rather than failing deep in a
  capability call). Until then it is intentionally omitted — the SDK's shape is the
  contract, and `yarn modules:build` rebuilds first-party bundles against the current SDK.

Defining the `ctx`/`CoreServices`/capability shapes carefully is the substance of "start
defining the shape of the SDK slowly"; formal versioning is the next increment, not this
one.

### 5.4 Reconciling with `architecture.md` §2/§12

The doc currently says modules are "operator-shipped code in the operator's image" and
lists "runtime plugin installation, hot-loadable adapters" as out of scope. This proposal
sits deliberately between those:

- **Adopted:** load-at-startup from operator-provided, pre-built bundles. The app image is
  fixed; the operator composes a deployment declaratively.
- **Still out of scope:** hot-reloading modules in a running process, a marketplace,
  fetching modules over the network at boot, and any runtime *isolation* — loaded code
  runs in-process with full trust. Operators load only modules they trust, exactly as
  today. Isolation stays a review/lint boundary (§7), not a runtime sandbox.

`architecture.md` §2/§12 should be amended to describe this operator model when the
proposal is accepted.

### 5.5 Boot sequence

In `instrumentation.ts` → a core `bootstrapModules()`:

```
1. Read + zod-validate solivio.config.json (modules[], slots).
2. For each configured module, in config order:
     a. resolve its bundle entry across module roots (operator root wins)
     b. dynamically import it; read + shape-check the default-export ModuleFactory
     c. build ModuleContext (logger.child({ module: id }), scoped config, services, ai, events)
     d. options = factory.parseOptions(config.modules[i].options ?? {})
     e. contributions = await factory.register(ctx, options)
3. Merge contributions into typed registries.
4. Validate: unique module ids, unique tool names, slot bindings resolve, kinds correct.
5. Wire reserved subscribers to the bus (when that phase lands).
6. Freeze registries; expose getAgentTools()/getImporters()/getImporter(slot)/…
```

The public accessors (`getAgentTools`, `getImporters`, `getImporter`, `getRenderers`)
keep their signatures, so call sites like the product-import route and the chat agent
don't churn. A malformed or incompatible module fails the boot loudly with its name and
reason — never silently.

### 5.6 What this deletes

- **The per-module Dockerfile `COPY` pairs.** The image carries the starter pack as one
  directory (`COPY modules-dist/ /app/modules.default/`); a new first-party module is a
  new subdirectory, not a Dockerfile edit. Operator modules never touch the image.
- **`scripts/sync-modules.mjs`.** There is no `modules/` ↔ config drift to police: config
  is authoritative and resolved at runtime. (A lightweight `yarn check` validation that
  every first-party `modules/*` package builds a loadable bundle replaces it.)
- **The `@solivio/module-*` special-casing in `next.config.mjs`.** File-URL dynamic
  import with the ignore comments needs no `serverExternalPackages` entry; that glob goes
  away.

### 5.7 Enabling a module — the new flow

- **Operator, any module:** place the built bundle under `SOLIVIO_MODULES_DIR` (mount a
  volume, `npm pack` + extract, or `git clone` a built artifact), add one entry to
  `solivio.config.json`, restart the container. **No app rebuild.**
- **First-party author:** add `modules/<name>/` (a workspace package built to
  `dist/index.mjs`), and `yarn modules:build` emits it into the image's starter-pack
  directory. No Dockerfile edit, no `registry.ts` edit, no drift script.

## 6. SDK package shape

Grow `@solivio/sdk` deliberately. Target layout (folding in the abandoned sketch's
`testing`/`config`/`peer-deps` ideas):

```
sdk/src/
  index.ts                    # public exports
  define-module.ts            # defineModule, ModuleFactory, ModuleContributions
  module-context.ts           # ModuleContext, Logger, ConfigResolver, AiClientFactory, EventBus
  services.ts                 # CoreServices + per-domain service interfaces (types only)
  capabilities/
    agent-tool.ts             # AgentTool (StandardSchema-typed) — exists today
    importer.ts               # ImporterDefinition<TPayload, TRecord> — generalized
    renderer.ts               # RendererDefinition — reserved
    event-subscriber.ts       # EventSubscriber + event payload types — reserved
  entities/                   # ProductInput, OfferSnapshot, … (write/read DTOs)
  testing.ts                  # createTestContext() — unit-test a module's register() in isolation
```

SDK dependency and packaging rules:

- `@standard-schema/spec` stays a runtime dep; schema libraries (zod) are the module
  author's choice (peer).
- The SDK exports **only types and pure functions** — no app code, no infra, no
  module-scoped state. This runtime-inertness is what makes it safe to bundle the SDK into
  every module (§5.3).
- We publish a `create-solivio-module` scaffold and a shared build preset (tsup/esbuild)
  so first- and third-party modules emit identical, loadable `dist/index.mjs` bundles.

### 6.1 Generalized importer

```ts
export type ImportTarget = "product"; // grows: "customer" | "request" | …
export interface ImporterDefinition<TPayload = unknown, TRecord = ProductInput> {
  name: string;
  description: string;
  accept: string[];          // HTML <input accept>
  target: ImportTarget;      // which CoreService receives the records
  run(payload: TPayload): Promise<ImportResult<TRecord>>;
}
```

The core routes `result.records` to `ctx.services[target].import(...)`. v0 wires only
`product`.

### 6.2 Agent tools become module contributions

The behavioral payoff. Today the chat agent imports in-app tools. After:

```ts
// modules/offer-tools/src/index.ts
export default defineModule({
  id: "offer-tools",
  name: "Offer editing tools",
  version: "0.1.0",
  register(ctx) {
    return {
      agentTools: [
        searchProductsTool(ctx.services.products),
        addProductToOfferTool(ctx.services.offers),
        // …the rest of today's offerLineItemTools, now closing over ctx.services
      ],
    };
  },
});
```

`chatAgent` keeps `tools: await getAgentTools()` from the registry. The tools are now
relocatable, independently testable (via `createTestContext()`), and overridable per
deployment — realizing `architecture.md` §6 ("modules extend agents via tools").

## 7. Guardrails (lint, not runtime)

Per `architecture.md` §2, isolation is enforced by review and lint, not the runtime:

- **Modules may import only `@solivio/sdk`** (+ their own schema lib + `@solivio/domain`
  types). A Biome/lint boundary rule forbids `@/server/*` and cross-module imports.
- **No canonical writes outside `ctx.services`.** Direct `db`/Drizzle imports in
  `modules/*` are banned by lint.
- **The SDK stays runtime-inert.** No singletons, no module-scoped mutable state, no
  cross-boundary `instanceof`. This is the invariant that makes independently-built,
  self-bundled modules safe to load into a fixed app (§5.3) — review must guard it.
- **`yarn check`** validates that every first-party `modules/*` package builds a loadable
  bundle and that `solivio.config.json` parses against the schema (replacing
  `sync-modules.mjs`).

## 8. Migration plan (phased, each phase shippable)

> **Status (2026-05-29): phases 0–4 landed.** The runtime loader, CoreServices
> (products + offers), the `defineModule` SDK, the converted CSV module, and the
> new `offer-tools` module are implemented and verified (dev + production build).
> The explicit ABI version gate (§5.3) was intentionally omitted at PoC. Remaining:
> phase 5 (the `create-solivio-module` scaffold and lint boundary rules) and phase
> 6 (reserved kinds + module persistence).

0. **Prove the loader (spike).** ✅ **Validated 2026-05-29.** A self-contained ESM bundle
   (esbuild `--bundle --format=esm --platform=node`, with `@solivio/sdk` *and* a
   third-party dep `nanoid` fully inlined — confirmed zero residual external imports) was
   placed at an external path (`/tmp/...`, outside the app's `node_modules`) and imported
   by file URL with `import(/* webpackIgnore */ /* turbopackIgnore */ url)`. It executed
   `register()` end-to-end (SDK code path + inlined dep both ran) in: (a) plain Node,
   (b) `next dev` (turbopack), and (c) `next build` + `next start` (production bundler).
   The production build did **not** attempt to trace/bundle the external module — it
   stays external and operator-provided, exactly as intended. The one load-bearing risk
   is settled.

   *Aside surfaced by the spike:* local `dist/` build artifacts (gitignored) had drifted
   to a previous `defineModule` prototype while `src/` was on `createModule`; a clean
   `yarn modules:build` reconciles them. Worth a clean rebuild before Phase 1.
1. **SDK shape.** Add `defineModule`, `ModuleContext`, `ModuleContributions`,
   `CoreServices` *interfaces*, `testing.ts`. Land the package layout and the shared
   module build preset.
2. **Runtime loader.** Implement `bootstrapModules()`: resolve bundles across module
   roots, file-URL dynamic import, shape-check, options validation, registries.
   Convert the CSV module to `defineModule` and a self-contained bundle. Replace
   `capabilities.productImporter` with `slots`. Delete `sync-modules.mjs`, drop the
   Dockerfile per-module `COPY` (replace with one starter-pack dir copy) and the
   `serverExternalPackages` glob.
3. **CoreServices for products + offers.** Implement the handles over today's services.
   Move `offerLineItemTools` into an `offer-tools` module that closes over
   `ctx.services`. `chatAgent` consumes `getAgentTools()`.
4. **Generalize the importer** (`target` + `ImportResult<TRecord>`); keep product the
   only wired target.
5. **Authoring + lint boundaries.** Ship `create-solivio-module`; add the import-boundary
   and SDK-inertness lint rules; fix any violations.
6. **(Later) Reserved kinds.** Wire renderers and observer event subscribers; then the
   `db`/`storage`/`jobs` context fields and `mod_<id>_` persistence when a module needs
   them.

## 9. Out of scope (unchanged from architecture.md §12)

Runtime install / marketplace / hot-loading, out-of-process modules, cross-provider
result merging, module-owned DB in v0, and the runtime-framework decision (`adr/0001`).

## 10. Short version

A module stops being static data and becomes a **factory**: `defineModule({ register(ctx,
options) → contributions })`. `ctx` hands it a logger, scoped config, an AI client, and
**typed core service handles** — so capabilities (starting with importers and agent
tools) can finally live in modules instead of being welded into the app. The app ships
**pre-built and fixed**; operators extend a deployment with **self-contained ESM module
bundles + a config file**, loaded by dynamic `import()` **at startup** — no app rebuild.
That works because the **SDK is runtime-inert** (safe to bundle into every module); the
`ModuleContext`/`CoreServices` contract is the seam, with explicit ABI versioning deferred
until modules ship out of band. An explicit `modules` list in config is the single source
of truth; selection of
exclusive capabilities moves from a stringly field to typed **slots**. This deletes the
per-module Dockerfile `COPY`, the drift script, and the `serverExternalPackages` glob.
Persistence and the remaining surfaces are reserved in the types now and wired later,
additively. Isolation stays a lint/review boundary, not a runtime one.
