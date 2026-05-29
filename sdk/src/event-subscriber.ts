/**
 * Observer-event subscribers — RESERVED capability kind (not yet wired into the
 * core pipeline).
 *
 * A subscriber reacts to a named pipeline transition (e.g. `offer_accepted`).
 * It has NO mutation rights: it may do anything in its own state or call out to
 * external systems, but to change canonical state it must call a core service
 * explicitly. Declared now so the contributions shape and registry are stable.
 */
export interface EventSubscriber<TPayload = unknown> {
  /** Pipeline event to subscribe to, e.g. "offer_accepted". */
  event: string;
  /** Optional name for diagnostics; defaults to the event name. */
  name?: string;
  handle(payload: TPayload): void | Promise<void>;
}
