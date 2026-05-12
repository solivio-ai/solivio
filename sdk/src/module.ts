import type { AgentTool } from "./agent-tool.js";
import type { ImporterDefinition } from "./importer.js";
import type { RendererDefinition } from "./renderer.js";

/**
 * The manifest every Solivio module must export.
 *
 * Naming rules for `id`:
 * - kebab-case only, e.g. "csv-products", "pdf-renderer"
 * - must be unique across all modules in a deployment
 * - used as a namespace prefix for module-owned database tables and storage keys
 */
export interface ModuleManifest {
  /** Stable kebab-case identifier. Used as table prefix and storage namespace. */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Semver version string. */
  version: string;
  /** Agent tools this module contributes. */
  agentTools?: AgentTool[];
  /** Input-surface importers this module contributes. */
  importers?: ImporterDefinition[];
  /** Output-surface renderers this module contributes. */
  renderers?: RendererDefinition[];
}

/**
 * Typed identity helper — validates the manifest shape at compile time
 * and provides a stable, importable factory for module authors.
 *
 * @example
 * export default createModule({
 *   id: "csv-products",
 *   name: "CSV Products",
 *   version: "0.1.0",
 *   importers: [csvProductImporter],
 * });
 */
export function createModule(manifest: ModuleManifest): ModuleManifest {
  return manifest;
}
