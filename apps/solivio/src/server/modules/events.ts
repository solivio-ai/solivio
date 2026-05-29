import "server-only";

import type { EventBus } from "@solivio/sdk";

/**
 * In-process pipeline event bus. Subscribe-only from a module's perspective.
 *
 * RESERVED: observer events are not yet emitted by the core pipeline, so
 * subscriptions registered in v0 simply never fire. The bus exists so the
 * ModuleContext shape and the eventSubscribers capability are stable now.
 */
const handlers = new Map<string, Array<(payload: unknown) => void | Promise<void>>>();

export const eventBus: EventBus = {
  subscribe(event, handler) {
    const list = handlers.get(event) ?? [];
    list.push(handler);
    handlers.set(event, list);
  },
};

/** Core-only: dispatch an event to subscribers. Unused until the pipeline emits. */
export async function emit(event: string, payload: unknown): Promise<void> {
  await Promise.all((handlers.get(event) ?? []).map((h) => h(payload)));
}
