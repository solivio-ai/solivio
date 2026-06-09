/**
 * Types for the root `solivio.config.ts` — the single source of truth for
 * which modules a deployment enables. Read at generate time only
 * (`yarn generate` bakes validated options into the generated registries);
 * never read at runtime.
 */

/** A module reference: in-tree directory name ("catalog") or npm package name ("@acme/solivio-module-x"). */
export type ModuleRef = string;

export type ModuleConfigEntry = ModuleRef | readonly [ModuleRef, Record<string, unknown>];

export interface SolivioConfig {
  readonly modules: readonly ModuleConfigEntry[];
  /**
   * Bindings for exclusive capabilities, e.g.
   * `{ "product.importer": "csv-import/csv-products" }`
   * (`<moduleId>/<capabilityName>`). Optional when exactly one provider exists.
   */
  readonly slots?: Readonly<Record<string, string>>;
}

export function defineConfig(config: SolivioConfig): SolivioConfig {
  return config;
}
