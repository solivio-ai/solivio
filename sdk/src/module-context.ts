/**
 * Structured logger handed to module code via `getLogger(moduleId)`.
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
 * Deployment AI model configuration exposed via `getAi()`. Capabilities that
 * call models go through the host's AI client; this hands them the ids to use
 * rather than raw provider credentials.
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
