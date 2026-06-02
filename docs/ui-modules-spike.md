# UI Modules Spike

Status: spike
Last updated: 2026-05-29

This spike explores how UI can move into modules without requiring the Next.js core to know
about each integration's React components at build time.

## Decision

Use **module-owned client islands** as the first module UI surface:

- modules return `ui.pages` and `ui.navItems` from `register`, alongside importers/tools;
- each `client-island` page declares a browser ESM `clientEntry` emitted into
  `modules-dist/<package>/ui/*.mjs`;
- the core renders an admin page shell under `/admin/modules/<moduleId>/<pageId>`;
- a small host client component loads the declared bundle over HTTP and calls
  `mount(element, context)`;
- the host exposes a frozen shared React/ReactDOM/JSX runtime through versioned browser
  shims, so module UI bundles do not embed their own React copy;
- the module bundle owns its own React root, component tree, state, and hooks;
- page-defined props are JSON-only, and the host augments them with SDK-typed runtime
  services such as `services.importer.importContent(content)` and
  `services.files.readAsText(file)`.

## Why an island instead of a normal Next Client Component

Runtime modules are self-contained ESM bundles imported by file URL on the server. They are
outside Next's build graph, so the app cannot import their client components as normal
hydrated App Router components unless we add a separate frontend extension build pipeline.

The island pattern avoids that bottleneck: the browser imports a module UI asset served by
the app, and the module renders into a dedicated DOM node. The plugin imports `react`,
`react-dom/client`, and `react/jsx-runtime` normally at authoring time; the module bundler
rewrites those imports to tiny host-runtime shims backed by the app's React runtime.

## What moved in the spike

- `@solivio/sdk` now includes `client-island` page metadata, nav descriptors,
  `LocalizedText`, and a small icon allowlist.
- `scripts/bundle-modules.mjs` now emits browser UI bundles from `modules/*/src/ui/*.tsx`
  and rewrites React imports to shared-runtime shims.
- `csv-products` and `csv-customers` now own their upload React components under
  `modules/<name>/src/ui/`.
- The admin sidebar receives module nav items from the server and points to module pages.
- The core serves declared module UI bundles through authenticated same-origin routes and
  exposes importer/file services to the plugin runtime. Plugins do not receive raw import
  endpoints as props.

## Bottlenecks / trade-offs observed

1. **Next build graph:** module UI is not an in-tree Next Client Component. It is a runtime
   island because the module bundle is discovered after the app is built.
2. **Runtime compatibility:** module UI bundles compile against the host React major. The
   shared runtime avoids duplicate React bytes, but makes React/ReactDOM compatibility part
   of the module UI ABI.
3. **Styling:** module bundles can use host CSS variables and existing utility classes, but
   Tailwind class discovery will not see arbitrary classes introduced only inside external
   module bundles. A production design needs a safelist, module CSS assets, or a shared UI
   kit package.
4. **Isolation:** this is trusted same-origin JavaScript, matching the current trusted
   server-module model. It is not an untrusted-plugin sandbox.

## Next decisions

1. Decide whether React islands are enough for admin module pages and offer-review widgets.
2. Add a full asset manifest with content hashes and optional CSS/assets. The current spike
   uses module version + emitted file size/mtime as the dynamic import cache key.
3. Add optional module CSS assets or a shared module UI kit.
4. Decide whether external modules should keep the global shared-runtime shim, move to
   import maps/a formal runtime package, or render in iframes for stronger isolation.
