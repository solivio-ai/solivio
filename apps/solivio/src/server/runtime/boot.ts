import "server-only";

import type { AuthGuards, SolivioRuntime } from "@solivio/sdk/runtime";
import { setRuntime } from "@solivio/sdk/runtime";
import { agentTools, importerProviders } from "@/generated/ai";
import { subscribers } from "@/generated/events";
import { jobs } from "@/generated/jobs";
import { moduleOptions, slotBindings } from "@/generated/modules";
import { createServices } from "@/generated/services";
import { db } from "@/server/database/db";
import { createModuleLogger } from "@/server/modules/logger";
import { getDefaultEmbeddingModel } from "@/server/runtime/ai/embeddingConfig";
import { getModelFor } from "@/server/runtime/ai/modelConfig";
import { createUsersService } from "@/server/runtime/usersService";

/**
 * Initializes the SDK runtime from the generated registries. Called once from
 * instrumentation.ts; everything module code reaches at runtime flows from
 * here.
 */
export function bootModuleRuntime(): void {
  const auth: AuthGuards = {
    async requireAuth() {
      const { requireAuth } = await import("@/server/auth/session");
      return requireAuth();
    },
    async requireAdmin() {
      const { requireAdmin } = await import("@/server/auth/session");
      return requireAdmin();
    },
  };

  const runtime: SolivioRuntime = {
    services: createServices({
      users: createUsersService,
    }),
    logger: (moduleId) => createModuleLogger({ module: moduleId }),
    db: db as SolivioRuntime["db"],
    ai: {
      chatModelId: () => getModelFor("chat"),
      embeddingModelId: () => getDefaultEmbeddingModel(),
      modelFor: (role) =>
        getModelFor(role as Parameters<typeof getModelFor>[0]) ?? getModelFor("chat"),
    },
    auth,
    // Importer resolution over the generated registry: an explicit slot
    // binding ("<moduleId>/<importerName>") wins; otherwise a sole provider
    // for the target is used implicitly.
    importer: async (target) => {
      const binding = slotBindings[`${target}.importer`];
      if (binding) {
        const [moduleId, importerName] = binding.split("/");
        const bound = importerProviders.find(
          (provider) => provider.moduleId === moduleId && provider.importer.name === importerName,
        );
        if (!bound) {
          throw new Error(`Slot "${target}.importer" is bound to unknown importer "${binding}"`);
        }
        return bound.importer;
      }
      const candidates = importerProviders.filter(
        (provider) => provider.importer.target === target,
      );
      if (candidates.length === 1) return candidates[0].importer;
      throw new Error(
        candidates.length === 0
          ? `No importer provides target "${target}"`
          : `Multiple importers provide target "${target}" — bind a slot in solivio.config.ts`,
      );
    },
    moduleOptions,
    agentTools,
    subscribers,
    jobs,
  };
  setRuntime(runtime);
}
