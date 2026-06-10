import type { EventName, Events } from "./registries.ts";

/**
 * An event subscriber — one per file under a module's `src/subscribers/`,
 * default-exported via {@link defineSubscriber}.
 */
export interface SubscriberDefinition<E extends EventName = EventName> {
  /** Unique id, conventionally `<moduleId>.<what-it-does>`. */
  readonly id: string;
  readonly event: E;
  /**
   * Persistent subscribers are delivered through the job queue (at-least-once,
   * with retries). Non-persistent subscribers run in-process when the event is
   * emitted; their errors are logged, never thrown into the emitter.
   */
  readonly persistent?: boolean;
  readonly handler: (payload: Events[E]) => void | Promise<void>;
}

export function defineSubscriber<E extends EventName>(
  subscriber: SubscriberDefinition<E>,
): SubscriberDefinition<E> {
  return subscriber;
}

/** Variance-safe shape for holding subscribers of heterogeneous events in one registry. */
export interface AnySubscriberDefinition {
  readonly id: string;
  readonly event: string;
  readonly persistent?: boolean;
  // biome-ignore lint/suspicious/noExplicitAny: payload type is event-specific; checked at definition site
  readonly handler: (payload: any) => void | Promise<void>;
}
