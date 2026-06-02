import type { StandardSchemaV1 } from "@standard-schema/spec";

import type { AgentTool } from "./agent-tool.js";
import type { EventSubscriber } from "./event-subscriber.js";
import type { AnyImporterDefinition } from "./importer.js";
import type { ModuleContext } from "./module-context.js";
import type { RendererDefinition } from "./renderer.js";
import type { ModuleUiContributions } from "./ui.js";

/**
 * The typed bag a module returns from `register`. Each field is a capability
 * kind. v0 wires `agentTools` and `importers`; `renderers` and
 * `eventSubscribers` are reserved (validated, but not yet consumed by the core).
 */
export interface ModuleContributions {
  agentTools?: AgentTool[];
  importers?: AnyImporterDefinition[];
  /** Declarative UI extension metadata consumed by core-owned host components. */
  ui?: ModuleUiContributions;
  /** Reserved — not yet wired into the pipeline. */
  renderers?: RendererDefinition[];
  /** Reserved — not yet wired into the pipeline. */
  eventSubscribers?: EventSubscriber[];
}

/**
 * A loadable module: identity + a `register` hook the core calls once at boot
 * with a {@link ModuleContext} and validated options. The default export of
 * every module bundle is a `ModuleFactory`.
 */
export interface ModuleFactory<Options = unknown> {
  /** Kebab-case stable id; unique per deployment; namespace for tables/storage. */
  readonly id: string;
  readonly name: string;
  /** Semver of the module itself. */
  readonly version: string;
  /** Validate raw config options against the module's schema. Throws on invalid. */
  parseOptions(raw: unknown): Options;
  register(
    ctx: ModuleContext,
    options: Options,
  ): ModuleContributions | Promise<ModuleContributions>;
}

export interface DefineModuleConfig<Options> {
  id: string;
  name: string;
  version: string;
  /** Standard Schema for this module's config options. Omit for an options-free module. */
  optionsSchema?: StandardSchemaV1<unknown, Options>;
  register: (
    ctx: ModuleContext,
    options: Options,
  ) => ModuleContributions | Promise<ModuleContributions>;
}

const KEBAB_CASE = /^[a-z][a-z0-9-]*$/;

/**
 * Defines a module. Returns a {@link ModuleFactory} the core loads at boot.
 *
 * @example
 * export default defineModule({
 *   id: "catalog-tool",
 *   name: "Catalog tool",
 *   version: "0.1.0",
 *   register(ctx) {
 *     return { agentTools: [searchCatalogTool(ctx.services.products)] };
 *   },
 * });
 */
export function defineModule<Options = Record<string, never>>(
  config: DefineModuleConfig<Options>,
): ModuleFactory<Options> {
  if (!KEBAB_CASE.test(config.id)) {
    throw new Error(`Module id "${config.id}" must be kebab-case (e.g. "csv-products").`);
  }
  const { optionsSchema } = config;
  return {
    id: config.id,
    name: config.name,
    version: config.version,
    parseOptions(raw: unknown): Options {
      if (!optionsSchema) return (raw ?? {}) as Options;
      const result = optionsSchema["~standard"].validate(raw ?? {});
      if (result instanceof Promise) {
        throw new Error(`Module "${config.id}" optionsSchema must be synchronous.`);
      }
      if (result.issues) {
        const detail = result.issues.map((i) => i.message).join("; ");
        throw new Error(`Invalid options for module "${config.id}": ${detail}`);
      }
      return result.value;
    },
    register: config.register,
  };
}
