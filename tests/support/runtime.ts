import type { AuthGuards, AuthSession, SessionUser, SolivioRuntime } from "@solivio/sdk/runtime";
import { setRuntime } from "@solivio/sdk/runtime";

type LoggerLevel = "debug" | "info" | "warn" | "error";

export type LogEntry = {
  level: LoggerLevel;
  moduleId: string;
  message: string;
  meta?: Record<string, unknown>;
};

export type TestRuntimeOverrides = Partial<Omit<SolivioRuntime, "services">> & {
  services?: Record<string, unknown>;
};

export const testUser: SessionUser = {
  id: "test-user",
  email: "test-user@example.com",
  name: "Test User",
  role: "admin",
};

const runtimeKey = Symbol.for("solivio.runtime");

export function resetTestRuntime(): void {
  delete (globalThis as Record<symbol, unknown>)[runtimeKey];
}

export function installTestRuntime(overrides: TestRuntimeOverrides = {}): SolivioRuntime {
  const runtime: SolivioRuntime = {
    services: {
      users: {
        findDisplayByIds: async (ids: string[]) => ids.map((id) => ({ id, name: id })),
      },
      ...(overrides.services ?? {}),
    } as SolivioRuntime["services"],
    logger: overrides.logger ?? createCapturingLogger().logger,
    db: overrides.db ?? missingDb,
    ai:
      overrides.ai ??
      ({
        chatModelId: () => "test-chat-model",
        embeddingModelId: () => "test-embedding-model",
        modelFor: () => "test-chat-model",
      } satisfies SolivioRuntime["ai"]),
    auth: overrides.auth ?? authenticatedAuth(),
    importer:
      overrides.importer ??
      (async (target) => {
        throw new Error(`No test importer registered for target "${target}"`);
      }),
    agentTools: overrides.agentTools ?? [],
    moduleOptions: overrides.moduleOptions ?? {},
    subscribers: overrides.subscribers ?? [],
    jobs: overrides.jobs ?? [],
    enqueue: overrides.enqueue,
  };

  setRuntime(runtime);
  return runtime;
}

export function authenticatedAuth(session: AuthSession = { user: testUser }): AuthGuards {
  return {
    requireAuth: async () => ({ session }),
    requireAdmin: async () => ({ session }),
  };
}

export function rejectedAuth(status = 401): AuthGuards {
  const response = new Response(null, { status });
  return {
    requireAuth: async () => ({ response }),
    requireAdmin: async () => ({ response }),
  };
}

export function createCapturingLogger(): {
  entries: LogEntry[];
  logger: SolivioRuntime["logger"];
} {
  const entries: LogEntry[] = [];

  function loggerFor(moduleId: string, bindings: Record<string, unknown> = {}) {
    const write = (level: LoggerLevel, message: string, meta?: Record<string, unknown>) => {
      entries.push({
        level,
        moduleId,
        message,
        meta: { ...bindings, ...(meta ?? {}) },
      });
    };

    return {
      debug: (message: string, meta?: Record<string, unknown>) => write("debug", message, meta),
      info: (message: string, meta?: Record<string, unknown>) => write("info", message, meta),
      warn: (message: string, meta?: Record<string, unknown>) => write("warn", message, meta),
      error: (message: string, meta?: Record<string, unknown>) => write("error", message, meta),
      child: (childBindings: Record<string, unknown>) =>
        loggerFor(moduleId, { ...bindings, ...childBindings }),
    };
  }

  return {
    entries,
    logger: (moduleId: string) => loggerFor(moduleId),
  };
}

const missingDb = new Proxy(
  {},
  {
    get(_target, prop) {
      throw new Error(`No test database registered; tried to access db.${String(prop)}`);
    },
  },
) as SolivioRuntime["db"];
