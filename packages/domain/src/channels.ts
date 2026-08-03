/**
 * Declares what an `offer` channel receives.
 *
 * This lives here, not in the SDK, because the entity owner should declare its
 * own channel input — the same way modules declare their services and events by
 * merging into the SDK's open registries. It keeps `@solivio/sdk` free of a
 * dependency on this package, and makes the target → input mapping a real type
 * rather than a convention each provider re-states.
 *
 * The only import is type-level, so nothing is pulled into a runtime bundle.
 */

// The SDK import must be present for the augmentation below to resolve and
// merge, the same way every module's `events.ts` opens with it.
import type {} from "@solivio/sdk";

import type { Offer } from "./models/offer";

/** Input handed to channels bound to the `offer` target. */
export interface OfferChannelInput {
  offer: Offer;
}

declare module "@solivio/sdk" {
  interface ChannelInputMap {
    offer: OfferChannelInput;
  }
}
