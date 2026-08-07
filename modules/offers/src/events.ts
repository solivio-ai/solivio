// This file must be a module (the import below) so the declaration AUGMENTS
// the SDK's Events interface instead of replacing the module type.
import type {} from "@solivio/sdk";

declare module "@solivio/sdk" {
  interface Events {
    "offers.offer.created": { offerId: string };
    /**
     * A salesperson accepted the offer — the point where a finalized offer is
     * ready to be acted on. Emitted after the transaction commits, and only on a
     * real transition (an already-accepted offer cannot be re-accepted).
     *
     * This is how a module acts on acceptance without a user clicking anything:
     * subscribe (`persistent: true` for anything reaching a remote system, so it
     * retries) and load the offer through the offers service. Subscribers are
     * observers — to change offer state they must call the service.
     */
    "offers.offer.accepted": { offerId: string };
  }
}
