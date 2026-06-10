import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import type { AgentId, AgentTool } from "./agent-tool.ts";
import type { ImporterDefinition, ImportTarget } from "./importer.ts";
import type { AnyJobDefinition } from "./job.ts";
import type { AiClientFactory, Logger } from "./module-context.ts";
import type { EventName, Events, ServiceName, Services } from "./registries.ts";
import type { AnySubscriberDefinition } from "./subscriber.ts";

/** Minimal session shape exposed to modules (provider-agnostic). */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role?: string | null;
}

export interface AuthSession {
  user: SessionUser;
}

/**
 * Result of an in-handler auth guard: either a session, or a ready-to-return
 * error `Response` (401/403).
 */
export type GuardResult =
  | { session: AuthSession; response?: never }
  | { session?: never; response: Response };

export interface AuthGuards {
  /** Requires a signed-in session. */
  requireAuth(): Promise<GuardResult>;
  /** Requires a signed-in admin. */
  requireAdmin(): Promise<GuardResult>;
}

/**
 * Server-only runtime accessors for module code.
 *
 * The host initializes the runtime once at boot (`instrumentation.ts`) from
 * the generated registries; module services, route handlers, subscribers, and
 * jobs reach shared infrastructure exclusively through these functions —
 * never through app internals or other modules' files.
 *
 * The store lives on `globalThis` under a well-known symbol so it survives
 * the bundler instantiating this file more than once.
 */

export interface SolivioRuntime {
  services: Services;
  logger: (moduleId: string) => Logger;
  db: NodePgDatabase<Record<string, unknown>>;
  ai: AiClientFactory;
  auth: AuthGuards;
  /** Resolves the importer bound to a target (via slot binding or sole provider). */
  importer: (target: ImportTarget) => Promise<ImporterDefinition>;
  /** All agent tools contributed by enabled modules (generated registry). */
  agentTools: ReadonlyArray<AgentTool>;
  moduleOptions: Record<string, unknown>;
  subscribers: ReadonlyArray<AnySubscriberDefinition>;
  jobs: ReadonlyArray<AnyJobDefinition>;
  /** Set by the jobs engine; absent until the queue phase is wired. */
  enqueue?: (jobName: string, payload: unknown) => Promise<void>;
}

const RUNTIME_KEY = Symbol.for("solivio.runtime");

type GlobalWithRuntime = typeof globalThis & { [RUNTIME_KEY]?: SolivioRuntime };

export function setRuntime(runtime: SolivioRuntime): void {
  const g = globalThis as GlobalWithRuntime;
  if (g[RUNTIME_KEY]) {
    // Hot reload in dev re-runs instrumentation; replace silently.
    if (process.env.NODE_ENV === "production") {
      throw new Error("Solivio runtime is already initialized");
    }
  }
  g[RUNTIME_KEY] = runtime;
}

function runtime(): SolivioRuntime {
  const g = globalThis as GlobalWithRuntime;
  const rt = g[RUNTIME_KEY];
  if (!rt) {
    throw new Error(
      "Solivio runtime is not initialized — module code ran before instrumentation boot",
    );
  }
  return rt;
}

/** Typed handle to another module's public service. */
export function getService<K extends ServiceName>(name: K): Services[K] {
  const service = runtime().services[name];
  if (!service) {
    throw new Error(`Unknown service "${String(name)}" — is its module enabled?`);
  }
  return service;
}

/** Structured logger pre-tagged with the module id. */
export function getLogger(moduleId: string): Logger {
  return runtime().logger(moduleId);
}

/** The shared Drizzle handle. Modules import their own table objects from their `data/schema.ts`. */
export function getDb(): NodePgDatabase<Record<string, unknown>> {
  return runtime().db;
}

/**
 * Lazy drop-in for a module-level `db` constant: every property access
 * resolves through {@link getDb} at call time, so importing this is safe
 * before the runtime boots.
 */
export const db: NodePgDatabase<Record<string, unknown>> = new Proxy(
  {} as NodePgDatabase<Record<string, unknown>>,
  {
    get(_target, prop) {
      const real = getDb() as unknown as Record<PropertyKey, unknown>;
      const value = real[prop];
      return typeof value === "function"
        ? (value as (...args: unknown[]) => unknown).bind(real)
        : value;
    },
  },
);

/** Deployment AI model ids. */
export function getAi(): AiClientFactory {
  return runtime().ai;
}

/** Session guards for module API routes (auth itself stays core). */
export function getAuth(): AuthGuards {
  return runtime().auth;
}

/** Agent tools contributed by enabled modules, optionally filtered by target agent. */
export function getAgentTools(agentId?: AgentId): ReadonlyArray<AgentTool> {
  const tools = runtime().agentTools;
  return agentId ? tools.filter((tool) => tool.agents.includes(agentId)) : tools;
}

/** The importer capability bound to a target ("product", "customer", …). */
export function getImporter(target: ImportTarget): Promise<ImporterDefinition> {
  return runtime().importer(target);
}

/** The module's validated options from `solivio.config.ts`. */
export function getModuleOptions<T = Record<string, unknown>>(moduleId: string): T {
  return (runtime().moduleOptions[moduleId] ?? {}) as T;
}

/**
 * Emit a typed event. In-process subscribers run inline (errors logged, never
 * thrown); persistent subscribers are enqueued on the job queue when wired.
 */
export async function emitEvent<E extends EventName>(name: E, payload: Events[E]): Promise<void> {
  const rt = runtime();
  for (const subscriber of rt.subscribers) {
    if (subscriber.event !== name) continue;
    if (subscriber.persistent && rt.enqueue) {
      await rt.enqueue(`subscriber:${subscriber.id}`, payload);
      continue;
    }
    try {
      await subscriber.handler(payload);
    } catch (error) {
      rt.logger("events").error(`Subscriber "${subscriber.id}" failed for "${String(name)}"`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/** Enqueue a background job by name. Available once the jobs engine is wired. */
export async function enqueueJob(jobName: string, payload?: unknown): Promise<void> {
  const rt = runtime();
  if (!rt.enqueue) {
    throw new Error("Job queue is not wired in this deployment");
  }
  await rt.enqueue(jobName, payload);
}
