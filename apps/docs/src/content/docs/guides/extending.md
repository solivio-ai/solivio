---
title: Extending Solivio
description: Run Solivio with your own custom modules — without forking, with painless base updates.
---

Solivio is designed to be extended with custom modules **without forking the
repository**. You keep your modules and deployment manifest in your own
repository (the *overlay*), link it into a stock Solivio checkout, and update
the base by pulling a new version — your files never conflict with upstream.

## The overlay layout

```
acme-solivio/                  # your repository
├── solivio.config.ts          # your full deployment manifest
├── modules/
│   └── acme-sync/             # your custom modules (same shape as built-ins)
│       ├── package.json       # "solivio": { "module": true }, exports "./*"
│       └── src/…
└── solivio/                   # stock Solivio checkout (git submodule or clone,
                               # pinned to a release tag)
```

Keep the overlay and the Solivio checkout close together (the overlay
containing the checkout, as above, or as sibling directories) — the build
widens its compilation root to their common ancestor.

## Setting up

```bash
git clone https://github.com/solivio-ai/solivio acme-solivio/solivio
cd acme-solivio/solivio

yarn overlay link ..            # wires your config + modules into the checkout
yarn install
cp apps/solivio/.env.example apps/solivio/.env.local   # set BETTER_AUTH_SECRET
yarn setup
yarn dev
```

`yarn overlay link <dir>` does three things, all recorded locally (never
committed):

1. symlinks each `<dir>/modules/<id>` into the checkout's `modules/` — Yarn
   registers them as workspaces, so their dependencies install and hot reload
   works on your real files;
2. copies `<dir>/solivio.config.ts` to `solivio.config.local.ts`, which the
   generator prefers over the in-repo default (and keeps in sync with your
   source on every `yarn generate`);
3. places a `node_modules` symlink in your overlay directory so imports
   resolve from your modules' real location.

All created paths go into `.git/info/exclude`, so the Solivio checkout stays
clean. `yarn overlay status` shows what is linked; `yarn overlay unlink`
removes everything.

## Your deployment manifest

The overlay's `solivio.config.ts` is the complete module list — built-ins plus
yours:

```ts
import { defineConfig } from "@solivio/sdk/config";

export default defineConfig({
  modules: [
    "catalog",
    "customers",
    "offers",
    "offer-chat",
    "csv-import",
    "order-history",
    ["acme-sync", { erpUrl: "https://erp.acme.example/api" }],
  ],
  slots: {
    "product.importer": "csv-import/csv-products",
    "customer.importer": "csv-import/csv-customers",
    "offer.importer": "csv-import/csv-orders",
  },
});
```

Omit a built-in module to disable it; add `[name, { …options }]` to pass
options validated against the module's schema.

## Writing a custom module

A custom module has exactly the same shape as the built-in ones — pages, API
routes, services, events, jobs, database tables with their own migrations,
translations, nav entries, agent tools, and importers, all discovered by file
convention. Use `modules/products-sync` in the Solivio repository as the
reference (it exercises every surface) and see `docs/module-system.md` for the
authoring guide.

Two overlay-specific notes:

- Give the package a scoped name that cannot collide with first-party modules
  (e.g. `@acme/solivio-module-acme-sync`) and keep `"solivio": { "module": true }`
  in its `package.json`.
- Make `tsconfig.json` self-contained (don't `extends` a Solivio file by
  relative path — your module's real location is outside the checkout).

After adding or changing modules: `yarn generate` (or just keep `yarn dev`
running — it regenerates on change), then `yarn db:migrate` if your module
ships migrations.

## Updating the base

Your repository contains no Solivio files, so updates are conflict-free:

```bash
cd solivio
yarn overlay unlink
git checkout -- yarn.lock        # discard the lockfile entries for your modules
git pull --tags && git checkout <new-release-tag>
yarn overlay link ..
yarn install && yarn setup       # re-generate, apply any new migrations
```

Read the release notes for SDK contract changes (`docs/contracts.md` defines
what is stable).

## Building a production image

The standard image build picks up whatever is linked:

```bash
cd solivio
yarn overlay link ..             # if not already linked
docker compose -f docker-compose.build.yml build
```

The image compiles your modules in and applies their migration journals at
container start, exactly like first-party modules.

## Alternative: npm-published modules

If you prefer to version modules independently (or share them between
deployments), publish them as npm packages and reference them by package name
in the manifest — no overlay modules directory needed:

```bash
yarn add @acme/solivio-module-erp-sync
# modules: [..., "@acme/solivio-module-erp-sync"]
```

The two approaches compose: overlay for in-house modules under active
development, npm for shared/stable ones.
