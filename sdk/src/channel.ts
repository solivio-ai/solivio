/**
 * Channels are the **output** surface: what a finalized entity is handed to.
 *
 * A channel takes a domain entity and does something outward with it — renders a
 * document, sends a message, creates a record in another system. One channel is
 * bound per target in `solivio.config.ts` (`"<target>.channel"`), the same
 * exclusive-capability model importers use.
 *
 * Two deliberate differences from importers:
 *
 * 1. **Channels are effectful.** An importer is a pure transform whose records
 *    the core persists; a channel performs its own side effect, because only the
 *    provider knows the remote protocol (SMTP, an ERP's REST API). There is no
 *    way to keep that in the core without the core learning every protocol.
 * 2. **The input is a domain entity, not a raw payload** — the direction is
 *    reversed. Which entity a target carries is declared by whoever owns that
 *    entity, through {@link ChannelInputMap}, so this package needs no dependency
 *    on the packages the entities live in.
 */

/**
 * Channel target → the input its providers receive.
 *
 * Open interface, filled by declaration merging exactly like `Services` and
 * `Events` — `@solivio/domain` declares the `offer` target because it owns the
 * `Offer` type:
 *
 * ```ts
 * declare module "@solivio/sdk" {
 *   interface ChannelInputMap {
 *     offer: { offer: Offer };
 *   }
 * }
 * ```
 *
 * Adding a target is purely additive and needs no change here.
 */
// biome-ignore lint/suspicious/noEmptyInterface: merged by the packages owning each entity
export interface ChannelInputMap {}

/** Canonical entity a channel consumes. Derived from the map, so the two cannot drift. */
export type ChannelTarget = keyof ChannelInputMap;

/**
 * What a channel produced.
 *
 * A union rather than bytes, because the cases genuinely differ: a PDF renderer
 * returns a file the caller streams back, an ERP push returns only the id of the
 * record it created, and an email send has nothing to return at all. Forcing one
 * shape would make two of the three lie about what happened.
 */
export type ChannelResult =
  /**
   * A file the caller can stream or store. `Uint8Array<ArrayBuffer>` (not the
   * default `ArrayBufferLike`) so the body is directly usable as a `BodyInit` —
   * a shared-memory view is not.
   */
  | { kind: "document"; filename: string; contentType: string; body: Uint8Array<ArrayBuffer> }
  /** A record created in another system. */
  | { kind: "reference"; system: string; ref: string; url?: string }
  /** Done, with nothing to hand back (a message was sent). */
  | { kind: "acknowledged"; detail?: string };

export interface ChannelDefinition<K extends ChannelTarget = ChannelTarget> {
  /** Unique name within the providing module, e.g. "pdf". */
  name: string;
  description: string;
  /** Canonical entity this channel consumes; selects the binding. */
  target: K;
  run: (input: ChannelInputMap[K]) => Promise<ChannelResult>;
}

/**
 * Any channel, for registries that hold providers of mixed targets. A union over
 * the targets rather than `ChannelDefinition<ChannelTarget>`, so a definition for
 * one target stays assignable (its `run` is contravariant in the input).
 */
export type AnyChannelDefinition = { [K in ChannelTarget]: ChannelDefinition<K> }[ChannelTarget];
