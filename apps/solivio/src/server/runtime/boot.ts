import "server-only";

import type { AuthGuards, SolivioRuntime } from "@solivio/sdk/runtime";
import { setRuntime } from "@solivio/sdk/runtime";
import { subscribers } from "@/generated/events";
import { jobs } from "@/generated/jobs";
import { moduleOptions } from "@/generated/modules";
import { createServices } from "@/generated/services";
import { getModelFor } from "@/server/agents/modelConfig";
import { db } from "@/server/database/db";
import { createModuleLogger } from "@/server/modules/logger";
import { getDefaultEmbeddingModel } from "@/server/runtime/ai/embeddingConfig";

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
    services: createServices(),
    logger: (moduleId) => createModuleLogger({ module: moduleId }),
    db: db as SolivioRuntime["db"],
    ai: {
      chatModelId: () => getModelFor("chat"),
      embeddingModelId: () => getDefaultEmbeddingModel(),
    },
    auth,
    // Bridge to the legacy runtime-bundle registry until the importer modules
    // move to the codegen system (then this reads the generated ai registry).
    importer: async (target) => {
      const { getImporter } = await import("@/server/modules/registry");
      // The legacy registry exposes per-target overloads, not the union.
      return target === "product" ? getImporter("product") : getImporter("customer");
    },
    moduleOptions,
    subscribers,
    jobs,
  };
  setRuntime(runtime);
}
