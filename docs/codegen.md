# Code Generation Reference — `yarn generate`

Status: implemented
Audience: contributors
Last updated: 2026-06-10

`yarn generate` (source: `scripts/generate/index.mts`) is the single wiring step of the
modular monolith. It reads the deployment config, discovers each enabled module by file
convention, validates the module graph, and emits everything the app needs to compile
the modules in. The system design is in `module-system.md`; this file is the generator
reference.

```bash
yarn generate            # regenerate all artifacts (idempotent; only changed files rewritten)
yarn generate --check    # validate config + module graph only, emit nothing
yarn generate --watch    # re-run on changes to modules/ or solivio.config.ts (yarn dev runs this)
```

`yarn dev`, `yarn build`, `yarn setup`, and the Dockerfile all run the generator, as
does CI before `yarn check`.

## Inputs

1. **`solivio.config.ts`** (`scripts/generate/config.mts`) — the default-exported
   `defineConfig({ modules, slots })`. Module refs are in-tree directory names
   (`modules/<id>`) or npm package names (resolved via `require.resolve`); each resolved
   package must declare `"solivio": { "module": true }`. `[ref, options]` entries carry
   options.
2. **Module file conventions** (`scripts/generate/discover.mts`) — for each module:
   - `src/index.ts` is imported (via tsx) and must default-export `defineModule({...})`;
     for in-tree modules the `id` must equal the directory name. Options from the config
     are validated against `optionsSchema` (any Standard Schema) here, at generate time.
   - `src/pages/**` and `src/api/**/route.ts` are scanned for files and their exports
     (regex scan, not a TS program): default export, named exports, and **route segment
     config** (`dynamic`, `dynamicParams`, `revalidate`, `fetchCache`, `runtime`,
     `preferredRegion`, `maxDuration`, `experimental_ppr`) captured as raw literal text.
     Segment config must therefore be a single-line literal.
   - `src/subscribers/*.ts`, `src/jobs/*.ts`, `src/i18n/*.json`, and `src/acl.ts`
     (imported for its `permissions` export) are collected.
   - Presence flags for `services.ts`, `events.ts`, `nav.tsx`, `slots.tsx`,
     `data/schema.ts`, `contracts/routes.ts`, `ai/tools.ts`, `ai/importers.ts`.

## Validations (`scripts/generate/validate.mts`)

Generation fails (and `--check` reports) on:

- duplicate module ids;
- `dependsOn` referencing unknown/disabled modules (other than `"core"`), or cycles;
- page/API-route collisions between modules, or between a module and a handwritten app
  route (route groups are stripped before comparing URLs);
- an API route file exporting no HTTP method;
- a module table not named `<module_id>_*` (snake_case) and not in the grandfathered
  list (`validate.mts` holds the frozen set: `products`, `product_prices`, `customers`,
  `requests`, `offers`, `offer_items`, `offer_revisions`, `offer_chat_threads`,
  `offer_chat_messages`, `users`, `sessions`, `accounts`, `verifications`);
- a permission in `acl.ts` not prefixed `<moduleId>.`;
- a `slots` binding referencing a disabled/unknown module.

Discovery itself errors on: missing `package.json` or `solivio.module` marker, missing
`src/index.ts` manifest, manifest without `id`/`title`/`version`, in-tree directory/id
mismatch, and invalid options. The i18n emitter errors when a module id collides with a
top-level key of the app's own messages, and warns on missing locales or key drift
between a module's locales.

## Emitted artifacts

All output trees are generator-owned and **gitignored — never edit them**; stale files
are pruned on every run.

### Registries — `apps/solivio/src/generated/`

| File | Contents | Consumed by |
|------|----------|-------------|
| `modules.ts` | Module metadata, `moduleOptions` (validated), `slotBindings` | runtime boot (`boot.ts`) |
| `services.ts` | `createServices()` — lazy memoizing container over every module's service factories; imports each `services.ts` (which pulls the `Services` declaration merges into the program) | runtime boot; host adds core services (`users`) via `extra` |
| `events.ts` | Side-effect imports of every `events.ts` (Events declaration merges) + the `subscribers` array | runtime boot, jobs engine |
| `jobs.ts` | The `jobs` array (one per `src/jobs/*` file) | runtime boot, jobs engine |
| `ai.ts` | `agentTools` (merged `ai/tools.ts`) and `importerProviders` (merged `ai/importers.ts`, tagged with module id) | runtime boot (`getAgentTools`, `getImporter` resolution) |
| `nav.ts` | `navRegistry` — all `nav.tsx` entries tagged with module id, sorted by `order` | `AppSidebar` / `AdminSidebarSection` |
| `slots.tsx` | `slotRegistry` (merged, ordered) + the `Slot` host component | core via `@/generated/slots`; module pages via the `@solivio/slots` alias (next.config + tsconfig paths) |
| `acl.ts` | The `Permission` union type + `allPermissions` | permission-aware code |
| `schema.ts` | `export *` of every module `data/schema.ts` | tooling/typing over the full schema |
| `contracts.ts` | `moduleApiContracts` — merged `contracts/routes.ts` | OpenAPI generation (`src/server/api/contracts/routes.ts`) |
| `messages/<locale>.json` | App messages + each module's i18n under its `<moduleId>` namespace | next-intl (`src/i18n/request.ts`) |
| `tailwind.css` | `@source` directives for `packages/ui/src` and every module's `src/` | `globals.css` (`@import "../generated/tailwind.css"`) |
| `next-modules.json` | Enabled module package names | `next.config.mjs` → `transpilePackages` |
| `public-routes.json` | Page + API URLs of `routeGroup: "public"` modules | session proxy (`src/proxy.ts`) |

### App-router stubs

| Tree | Contents |
|------|----------|
| `apps/solivio/src/app/(protected)/(gen)/**` | Page stubs for protected modules (session guard + app shell). If a module contributes `admin/**` pages, an `admin/layout.tsx` stub re-exports the app's admin guard layout into the generated subtree. |
| `apps/solivio/src/app/(gen-public)/**` | Page stubs for `routeGroup: "public"` modules. |
| `apps/solivio/src/app/api/(gen)/**` | API route stubs (`route.ts`) re-exporting the module's HTTP method handlers. |

A stub re-exports `default` plus the allowed named exports (pages: `metadata`,
`generateMetadata`, `viewport`, `generateViewport`, `generateStaticParams`; routes: the
HTTP methods). **Route segment config is inlined, not re-exported** — Next.js statically
parses segment config and rejects re-exports (verified against Next 16; see
`adr/0002`), so the scanned literal values are written into the stub verbatim.

### Database wiring — `apps/solivio/src/generated/db/`

| File | Contents | Consumed by |
|------|----------|-------------|
| `drizzle.<moduleId>.config.ts` | Per-module drizzle-kit config: the module's `data/schema.ts` vs its `data/migrations/` journal, migrations table `drizzle_migrations_<module_id>` | `yarn db:generate <moduleId>` (`scripts/db/generate.mjs`) |
| `migrations.json` | Ordered manifest `{ id, dir, table }` of module journals | migration runner (`apps/solivio/scripts/migrate.mjs`), drift check (`check-drizzle-drift.mjs`) |
| `drizzle.studio.config.ts` | Studio/inspection config spanning core + all module schemas | `yarn db:studio` |

## When to regenerate

Run `yarn generate` (or rely on the `yarn dev` watcher) after:

- editing `solivio.config.ts` (enable/disable a module, change options or slots);
- adding/removing/renaming any conventional module file (a page, route, job,
  subscriber, i18n key file, `acl.ts`, …);
- changing a module manifest, its `optionsSchema`, or segment-config exports;
- adding or removing a module's `data/schema.ts` (before `yarn db:generate <id>`).

Editing only the *body* of an already-wired file needs no regeneration — the stubs and
registries reference the source by specifier. When in doubt, run it: output is
idempotent and reports `(no changes)`.
