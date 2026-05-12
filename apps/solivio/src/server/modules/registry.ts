/**
 * Module registry — wiring deferred until the first real module is built.
 *
 * TODO: When the first first-party module is added, implement the following:
 *
 * 1. Each module lives in `apps/solivio/src/server/modules/<module-id>/index.ts`
 *    and exports a default `ModuleManifest` created with `createModule()`.
 *
 * 2. Import all module manifests here and collect them into `registeredModules`.
 *    Example:
 *      import csvProducts from "./csv-products";
 *      export const registeredModules: ModuleManifest[] = [csvProducts];
 *
 * 3. At app startup, pass `registeredModules` to the core bootstrap function
 *    (to be implemented) which will:
 *    - validate manifests at boot (e.g. kebab-case ids, uniqueness, unique agent tool names).
 *      `ModuleManifest` is TypeScript-only in the SDK today; add a runtime schema (e.g. Zod)
 *      when this path exists if you want machine validation beyond compile time.
 *    - register tools with the agent tool registry
 *    - register importers with the input surface dispatcher
 *    - register renderers with the renderer registry
 *
 * Convention:
 * - Module id must be kebab-case and unique across the deployment.
 * - Module tables must be prefixed with `mod_<id>_`.
 * - Modules may not import from each other. Prefer `@solivio/sdk`, `zod`, shared packages such
 *   as `@solivio/domain`, and types/helpers the core exposes — not ad hoc cross-module imports.
 * - Modules may not write canonical tables directly — use core service handles (TBD).
 */

import type { ModuleManifest } from "@solivio/sdk";

// TODO: import and list first-party modules here
export const registeredModules: ModuleManifest[] = [];
