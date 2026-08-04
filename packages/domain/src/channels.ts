/**
 * Declares the `offer` channel target and the slots that carry a finalized offer
 * to whichever module is bound to it.
 *
 * Both live here, not in the SDK, because the entity owner should declare its own
 * surface — the same way modules declare their services and events by merging into
 * the SDK's open registries. It keeps `@solivio/sdk` free of a dependency on this
 * package while still typing the slot props as a real `Offer` rather than an id
 * each provider has to re-fetch.
 *
 * This package is the right home rather than `modules/offers` (which hosts the
 * slots) because a provider module must see the declaration too, and modules
 * cannot import each other. Host and provider both depend on `@solivio/domain`.
 *
 * The only imports are type-level, so nothing is pulled into a runtime bundle.
 */

// The SDK import must be present for the augmentation below to resolve and
// merge, the same way every module's `events.ts` opens with it.
import type {} from "@solivio/sdk";

import type { Offer } from "./models/offer";

declare module "@solivio/sdk" {
  interface ChannelTargets {
    offer: true;
  }

  interface SlotPropsMap {
    /**
     * The finalized-offer document area — **exclusive**. One preview owns that
     * column; a second would fight it for layout, so the host passes `providerId`
     * from `getChannelProvider("offer")` and only the bound module's contribution
     * renders. This is what the `"offer.channel"` binding decides.
     *
     * The whole offer is handed over rather than its id: the host already holds
     * it client-side, and every field is serializable, so re-fetching to display
     * it would be pure waste. Effects are a different matter — a provider route
     * must re-fetch by id and never trust a posted offer.
     */
    "offer-detail.document": { offer: Offer };
    /**
     * Actions on a finalized offer — **additive**. Every module acting on
     * accepted offers contributes here and all of them render: a deployment
     * wants the PDF download *and* a push to a back-office system, not a choice
     * between them. No binding is required to appear.
     *
     * Exclusivity would be wrong here. Each contribution posts to its own
     * module's route, so several can coexist without competing — the earlier
     * argument against additive actions only held while a single bound channel
     * owned the one trigger.
     */
    "offer-detail.actions": { offer: Offer };
  }
}
