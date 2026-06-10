import type { CoreServices } from "./services.ts";

/**
 * Structured logger handed to a module, pre-tagged with the module id.
 * The core supplies the implementation; modules never reach for `console`.
 */
export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  /** Returns a child logger with additional bound fields. */
  child(bindings: Record<string, unknown>): Logger;
}

/**
 * Typed, namespaced configuration + secrets resolver for a module.
 * Values are scoped to the module's id by the core.
 */
export interface ConfigResolver {
  /** Returns a config/secret value, or `undefined` if unset. */
  get(key: string): string | undefined;
  /** Returns a config/secret value, or throws if unset. */
  require(key: string): string;
}

/**
 * Factory exposing the deployment's configured AI model identifiers.
 * Capabilities that call models go through the core's AI client; this hands
 * them the ids to use rather than raw provider credentials.
 */
export interface AiClientFactory {
  /** Default chat/completion model id for the deployment. */
  chatModelId(): string;
  /** Default embedding model id for the deployment. */
  embeddingModelId(): string;
  /**
   * Model id for a named agent role (e.g. "offerGeneration", "chat").
   * Falls back to the deployment chat model for unknown roles.
   */
  modelFor(role: string): string;
}

/**
 * Subscribe-only pipeline event bus.
 *
 * Reserved for the (not-yet-wired) observer-event capability: subscribers react
 * to pipeline transitions but have NO mutation rights — to change canonical
 * state they call a core service explicitly. Modules never emit core events.
 */
export interface EventBus {
  subscribe(event: string, handler: (payload: unknown) => void | Promise<void>): void;
}

/**
 * The single seam between a module and shared infrastructure. The core builds
 * one per module at boot and passes it to `register`. A module reaches for
 * nothing else — no `process.env`, no raw DB, no app internals.
 *
 * v0 carries what importers and agent tools need. Reserved fields
 * (`db`, `storage`, `jobs`, `i18n`, `agents`) are added in later phases.
 */
export interface ModuleContext {
  logger: Logger;
  config: ConfigResolver;
  ai: AiClientFactory;
  /** Typed handles to canonical core services — the only path to canonical state. */
  services: CoreServices;
  events: EventBus;
}
