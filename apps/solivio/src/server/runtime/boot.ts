import "server-only";

import type { ChannelTarget } from "@solivio/sdk";
import type { AuthGuards, ChannelProvider, SolivioRuntime } from "@solivio/sdk/runtime";
import { setRuntime } from "@solivio/sdk/runtime";
import { agentTools, importerProviders } from "@/generated/ai";
import { channelProviders } from "@/generated/channels";
import { subscribers } from "@/generated/events";
import { jobs } from "@/generated/jobs";
import { moduleOptions, slotBindings } from "@/generated/modules";
import { createServices } from "@/generated/services";
import { db } from "@/server/database/db";
import { getDefaultEmbeddingModel } from "@/server/runtime/ai/embeddingConfig";
import { getModelFor } from "@/server/runtime/ai/modelConfig";
import { createModuleLogger } from "@/server/runtime/logger";
import { createUsersService } from "@/server/runtime/usersService";

/**
 * Channel resolution, identical in shape to the importer resolver below: an
 * explicit slot binding ("<moduleId>/<channelName>") wins; otherwise a sole
 * provider for the target is used implicitly. Returns the module id alongside
 * the channel so UI can restrict itself to that module's contribution (see
 * `hasSlotContribution`/`Slot`'s `providerId` in `@/generated/slots`) — `channel`
 * below is this same resolution with the module id dropped.
 */
async function resolveChannelProvider<K extends ChannelTarget>(
  target: K,
): Promise<ChannelProvider<K>> {
  const binding = slotBindings[`${target}.channel`];
  if (binding) {
    const [moduleId, channelName] = binding.split("/");
    const bound = channelProviders.find(
      (provider) => provider.moduleId === moduleId && provider.channel.name === channelName,
    );
    if (!bound) {
      throw new Error(`Slot "${target}.channel" is bound to unknown channel "${binding}"`);
    }
    return bound as unknown as ChannelProvider<K>;
  }
  const candidates = channelProviders.filter((provider) => provider.channel.target === target);
  if (candidates.length === 1) return candidates[0] as unknown as ChannelProvider<K>;
  throw new Error(
    candidates.length === 0
      ? `No channel provides target "${target}"`
      : `Multiple channels provide target "${target}" — bind a slot in solivio.config.ts`,
  );
}

/**
 * Initializes the SDK runtime from the generated registries. Called once from
 * instrumentation.ts; everything module code reaches at runtime flows from
 * here.
 */
export function bootModuleRuntime(): SolivioRuntime {
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
    channel: async (target) => (await resolveChannelProvider(target)).channel,
    channelProvider: resolveChannelProvider,
    moduleOptions,
    agentTools,
    subscribers,
    jobs,
  };
  setRuntime(runtime);
  return runtime;
}
