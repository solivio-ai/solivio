/**
 * Channels are the **output** surface: what a finalized entity is handed to.
 *
 * A channel is a *declaration*, not a callable. It marks a module as the
 * destination for a target's finalized entities — the unit a deployment binds in
 * `solivio.config.ts` (`"<target>.channel"`, the same exclusive-capability model
 * importers use) and the thing a host filters slot contributions by.
 *
 * The provider receives the entity through the target's slots and owns whatever
 * it does with it:
 *
 * - **rendering or a remote call** goes in the module's own API routes, because
 *   both need the server (a renderer, or credentials that must never reach the
 *   browser),
 * - **anything that should happen with nobody watching** goes in the module's own
 *   subscribers, so the module decides when it acts.
 *
 * The core never invokes a channel; it resolves which one is bound
 * ({@link getChannelProvider}) and nothing more. An earlier design gave channels a
 * `run` the core called, but its only possible caller was a shared route that
 * could handle just one of the result shapes, and a destination module's own
 * trigger was never allowed to use it. See
 * `docs/adr/0005-channels-output-capability.md`.
 *
 * ## The rule for provider routes
 *
 * **A provider's route takes an id and re-fetches the entity. It must never
 * accept the entity as a request body.** Slot props live in the browser and can
 * be edited; a route that trusts a posted entity lets any session push forged
 * data to the destination.
 */

/**
 * Channel targets, open for merging by whoever owns the entity — `@solivio/domain`
 * declares `offer`, alongside the slot props that carry it. Keeps this package
 * free of a dependency on the packages the entities live in, and makes adding a
 * target purely additive.
 *
 * ```ts
 * declare module "@solivio/sdk" {
 *   interface ChannelTargets {
 *     offer: true;
 *   }
 * }
 * ```
 */
// biome-ignore lint/suspicious/noEmptyInterface: merged by the packages owning each entity
export interface ChannelTargets {}

/** Canonical entity a channel is the destination for. Derived from the map, so the two cannot drift. */
export type ChannelTarget = keyof ChannelTargets;

export interface ChannelDefinition {
  /** Unique name within the providing module, e.g. "pdf". */
  name: string;
  description: string;
  /** Canonical entity this channel is the destination for; selects the binding. */
  target: ChannelTarget;
}
