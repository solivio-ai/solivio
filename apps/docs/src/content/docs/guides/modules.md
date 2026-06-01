---
title: Modules
description: Configure and add Solivio modules in a deployment without rebuilding the app.
---

Solivio's behaviour is extended by **modules** — self-contained units that add
capabilities such as catalog importers and assistant tools. Modules are
**pre-built bundles loaded at startup**, so you change what a deployment can do
by editing one config file and providing the bundle — never by rebuilding the
app.

The published image ships a **starter pack** of first-party modules, so a stock
deployment works end to end with no module configuration at all:

- `@solivio/module-csv-products` — imports a product catalog from CSV.
- `@solivio/module-offer-tools` — the offer-review assistant's catalog and
  offer-editing tools.

This guide is for operators running Solivio. To *build* a module, see the
**Development** section.

## How modules load

At startup the app:

1. Reads the deployment manifest `solivio.config.json` (path set by
   `SOLIVIO_CONFIG_PATH`).
2. For each listed module, resolves its bundle at
   `${SOLIVIO_MODULES_DIR}/<package>/index.mjs` and loads it.
3. Registers the capabilities each module contributes.

A missing bundle, a duplicate name, or an unresolved slot **fails the boot with
an explicit error** — the app never starts in a half-configured state.

In the published image these are preset, and the starter-pack bundles are baked
in:

| Variable | Default in image | Purpose |
| --- | --- | --- |
| `SOLIVIO_CONFIG_PATH` | `/app/solivio.config.json` | Location of the deployment manifest. |
| `SOLIVIO_MODULES_DIR` | `/app/modules-dist` | Directory holding module bundles, one folder per package. |

## The config file

`solivio.config.json` is the single source of truth for which modules load. The
default shipped in the image is:

```json
{
  "modules": [
    { "package": "@solivio/module-csv-products", "options": {} },
    { "package": "@solivio/module-offer-tools", "options": {} }
  ],
  "slots": {
    "product.importer": "csv-products/csv-products"
  }
}
```

| Field | Description |
| --- | --- |
| `modules[].package` | Package name of a module bundle present under `SOLIVIO_MODULES_DIR`. |
| `modules[].options` | Optional settings passed to that module (each module validates its own). |
| `slots` | Binds an exclusive capability to one provider — see below. |

Listing a module is all it takes to activate the additive capabilities it
contributes (for example, assistant tools).

## Capability slots

Some capabilities are **exclusive**: a deployment runs exactly one of them even
if several modules could provide it. The product importer is the first such
slot. Bind it with `"<target>.importer": "<moduleId>/<importerName>"`:

```json
"slots": { "product.importer": "csv-products/csv-products" }
```

If only one module provides an importer for a target, it is the implicit default
and the slot entry is optional. When more than one is loaded, the slot must
choose, or the boot fails with a message telling you to set it.

## Module options and secrets

Non-secret settings go in a module's `options` object:

```json
{ "package": "@acme/solivio-module-odoo", "options": { "baseUrl": "https://erp.example.com" } }
```

Secrets are supplied through environment variables, never the config file. Each
module reads namespaced variables of the form
`SOLIVIO_MOD_<MODULE_ID>_<KEY>`, where the module id is upper-cased and dashes
become underscores. For a module with id `odoo` needing an API key:

```bash
SOLIVIO_MOD_ODOO_API_KEY=...
```

Each module's docs state which options and secrets it expects.

## Add a module to a deployment

Both methods below provide a **pre-built bundle plus a config entry**. Neither
rebuilds the application.

### Method A — layer onto the published image (recommended)

Create a thin image that copies your module bundle and config onto the stock
image. This only adds files; it does not run an application build.

```dockerfile
FROM ghcr.io/solivio-ai/solivio-app:latest

# A self-contained module bundle: <package>/index.mjs (+ package.json).
COPY ./my-modules/@acme/solivio-module-odoo \
     /app/modules-dist/@acme/solivio-module-odoo

# Your manifest must list the starter-pack modules you keep, plus the new one.
COPY ./solivio.config.json /app/solivio.config.json
```

```bash
docker build -t my-solivio-app .
```

Point your Compose stack at `my-solivio-app` instead of the published image and
redeploy.

### Method B — mount a modules directory

Keep all bundles you want on the host and mount them as the modules root, along
with your config. Because `SOLIVIO_MODULES_DIR` is a single directory, the
mounted folder must contain **every** module you enable, including the
starter-pack bundles you still use.

```yaml
services:
  app:
    image: ghcr.io/solivio-ai/solivio-app:latest
    environment:
      SOLIVIO_MODULES_DIR: /modules
      SOLIVIO_CONFIG_PATH: /solivio.config.json
    volumes:
      - ./modules:/modules:ro
      - ./solivio.config.json:/solivio.config.json:ro
```

To start from the shipped set, copy it out of a container first:

```bash
docker create --name solivio-tmp ghcr.io/solivio-ai/solivio-app:latest
docker cp solivio-tmp:/app/modules-dist ./modules
docker cp solivio-tmp:/app/solivio.config.json ./solivio.config.json
docker rm solivio-tmp
```

Add your bundle under `./modules/<package>/`, list it in
`./solivio.config.json`, and redeploy.

## Verify

After redeploying, confirm a clean start:

```bash
docker compose logs -f app
curl -fsS https://<APP_HOST>/api/health
```

If a module is misconfigured the app logs a clear reason and stops. Common
messages:

| Message | Cause |
| --- | --- |
| `Failed to load module bundle "<pkg>" from <path>` | The package isn't present under `SOLIVIO_MODULES_DIR`, or the path is wrong. |
| `Duplicate module ids` / `agent tool names` / `importer names` | Two enabled modules collide; remove or replace one. |
| `Slot "product.importer" is bound to "…", but no loaded module provides it` | The slot value doesn't match a loaded module/importer; fix the binding or enable the module. |
| `Multiple product importers are loaded; set slots["product.importer"]` | More than one provider; pick one in `slots`. |

## Where module bundles come from

- **Starter pack** — shipped inside the published image; nothing to install.
- **External modules** — distributed as npm packages built into a single
  self-contained ESM bundle (`index.mjs`). Obtain the built bundle (from the
  author, an npm package, or your own build), place it under
  `SOLIVIO_MODULES_DIR`, and enable it in the config.

Module authoring — the SDK, capability surfaces, and how bundles are produced —
is covered in the **Development** section and the project's `contracts.md`.
