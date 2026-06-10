import "server-only";

import type { AiClientFactory, ConfigResolver, ModuleContext } from "@solivio/sdk";
import { getModelFor } from "@/server/agents/modelConfig";
import { getDefaultEmbeddingModel } from "@/server/runtime/ai/embeddingConfig";

import { coreServices } from "./coreServices";
import { eventBus } from "./events";
import { createModuleLogger } from "./logger";

/** Per-module namespaced config/secret resolver, backed by env vars. */
function createConfigResolver(moduleId: string): ConfigResolver {
  const prefix = `SOLIVIO_MOD_${moduleId.toUpperCase().replace(/-/g, "_")}_`;
  const get = (key: string) => process.env[prefix + key]?.trim() || undefined;
  return {
    get,
    require(key) {
      const value = get(key);
      if (value === undefined) {
        throw new Error(`Module "${moduleId}" requires config "${key}" (env ${prefix}${key}).`);
      }
      return value;
    },
  };
}

const ai: AiClientFactory = {
  chatModelId: () => getModelFor("chat"),
  embeddingModelId: () => getDefaultEmbeddingModel(),
  modelFor: (role) =>
    getModelFor(role as Parameters<typeof getModelFor>[0]) ?? getModelFor("chat"),
};

/** Builds the single seam handed to a module's register() at boot. */
export function buildModuleContext(moduleId: string): ModuleContext {
  return {
    logger: createModuleLogger({ module: moduleId }),
    config: createConfigResolver(moduleId),
    ai,
    services: coreServices,
    events: eventBus,
  };
}
