# ADR 0002 — Build-time module codegen

Status: **accepted**
Date: 2026-06-10

Supersedes the runtime-bundle-loader design previously described in
`docs/module-system.md` (modules as self-contained ESM bundles loaded at startup from
`SOLIVIO_MODULES_DIR`), and **closes ADR 0001's open question**: we stay on Next.js.

## Context

The runtime loader (phases 0–4 of the old module-system proposal) shipped and worked
for headless capabilities: a module was a pre-built `.mjs` bundle, imported by file URL
at startup, returning importers and agent tools from `register(ctx, options)`. Its
operator promise was "drop a bundle + edit config, no app rebuild."

It hit a wall the moment modules needed to be *real features*:

- **Pages and API routes.** Next.js routing is file-based; a runtime-loaded bundle
  cannot contribute `app/` routes. ADR 0001 flagged exactly this ("frontend module
  bundles fight Next's bundling model") as the thing that could force re-platforming.
- **Types across the boundary.** Bundled modules cannot participate in declaration
  merging, so cross-module services and events could not be statically typed.
- **Persistence.** Module-owned tables need migrations that ship and apply with the
  module — impossible to do soundly when the app cannot see module source.
- **Two bundling models.** Self-contained bundles (SDK inlined, deps inlined) created a
  parallel build pipeline with its own drift class.

## Decision

Solivio is a **modular monolith wired by build-time code generation**:

- A module is a TypeScript **source package** under `modules/<id>` (or an npm package
  with `"solivio": { "module": true }`), discovered by file convention.
- `yarn generate` (`scripts/generate/`) reads `solivio.config.ts`, validates the module
  graph, and emits generated registries plus app-router **stubs** (re-export files)
  into gitignored trees; the Next.js build compiles modules in as `transpilePackages`.
- Enabling a module = config entry + regenerate + rebuild. `solivio.config.ts` is read
  at generate time only, never at runtime.
- Runtime wiring stays thin: `instrumentation.ts` boots a single SDK runtime from the
  generated registries; module code uses `@solivio/sdk/runtime` accessors.

This **resolves ADR 0001**: codegen squares the file-based-routing circle — module
pages/routes become first-class App Router citizens through generated stubs — so the
one concrete blocker that could have forced Fastify/Vite never materializes. We stay on
Next.js; ADR 0001 is marked accepted with this outcome.

## Spike findings (load-bearing)

- **Route segment config cannot be re-exported.** Next.js statically parses
  `export const dynamic/runtime/maxDuration/...` and rejects re-exports ("It mustn't be
  reexported" — verified against Next 16). The generator therefore scans module sources
  for segment-config exports and **inlines the literal values** into the stubs while
  re-exporting everything else. Consequence: segment config in module files must be
  single-line literals.
- **`tsc` needs `allowImportingTsExtensions`.** Modules are consumed as `.ts`/`.tsx`
  source with explicit extensions in specifiers; `tsconfig.base.json` and every module
  tsconfig enable `allowImportingTsExtensions` so standalone typechecks pass.

## Alternatives

- **Keep the runtime loader** — rejected: cannot deliver pages/routes/types/migrations
  (context above), which is most of what a feature module is.
- **Next.js Module Federation / multi-zone** — rejected: rough, server-components
  story unclear, still no typed services or migrations.
- **Re-platform (Fastify + Vite SPA, ADR 0001 option B)** — rejected: total rewrite to
  regain what codegen provides for the cost of a generator script.

## Consequences

- **Traded away: "no-rebuild module install."** Operators compose a deployment by
  editing `solivio.config.ts` and building/pulling an image, not by dropping bundles.
  `SOLIVIO_MODULES_DIR` and `yarn modules:build`/`scripts/bundle-modules.mjs` are gone.
  This is a deliberate exchange — first-class pages/routes, declaration-merged types,
  per-module migrations, and a single bundling model were worth more.
- The generated trees (`apps/solivio/src/generated/**`, the `(gen)` app groups) are
  generator-owned, gitignored, and must never be hand-edited; `yarn generate` runs in
  setup, dev (watch), build, Docker, and CI.
- Module isolation moves from "physically separate bundle" to **enforced convention**:
  the generator's validations plus `scripts/check-boundaries.mts` in `yarn check`.
- Out-of-tree distribution remains possible (npm package + config entry) but implies a
  rebuild, matching the operator model in `architecture.md` §2.
- Per-module persistence becomes tractable — decided separately in ADR 0003; the
  jobs/events engine in ADR 0004.
