import type { StandardSchemaV1 } from "@standard-schema/spec";

/**
 * Static module manifest — the default export of a module's `src/index.ts`.
 *
 * Capabilities (pages, api routes, services, events, jobs, …) are NOT listed
 * here; they are discovered by `yarn generate` from the module's conventional
 * file layout. The manifest carries only identity, options validation, and
 * the dependency declaration.
 */
export interface ModuleManifest<TOptions = Record<string, never>> {
  /** Kebab-case, unique per deployment; must equal the module directory name for in-tree modules. */
  readonly id: string;
  /** Human-readable name shown in admin/module overviews. */
  readonly title: string;
  /** Semver. */
  readonly version: string;
  readonly description?: string;
  /**
   * Validates the options object from `solivio.config.ts` at generate time.
   * Any Standard Schema (zod, valibot, …).
   */
  readonly optionsSchema?: StandardSchemaV1<unknown, TOptions>;
  /** Ids of modules whose services/events this module consumes. */
  readonly dependsOn?: readonly string[];
  /**
   * Which app layout group this module's pages mount into.
   * "protected" (default): behind the session guard, inside the app shell.
   * "public": no session required.
   */
  readonly routeGroup?: "protected" | "public";
}

const MODULE_ID_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export function defineModule<TOptions = Record<string, never>>(
  manifest: ModuleManifest<TOptions>,
): ModuleManifest<TOptions> {
  if (!MODULE_ID_PATTERN.test(manifest.id)) {
    throw new Error(`Module id must be kebab-case (got "${manifest.id}")`);
  }
  return manifest;
}
