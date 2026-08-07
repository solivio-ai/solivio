import type { ChannelDefinition } from "@solivio/sdk";

/**
 * Declares this module as a destination for finalized offers.
 *
 * There is nothing to run here: the declaration exists so a deployment can bind
 * it (`"offer.channel": "offer-pdf/pdf"`) and so the accepted-offer screen knows
 * whose slot contributions to render. The rendering itself lives in
 * `lib/renderOfferPdf.ts`, reached through this module's own route.
 */
export const channels: ChannelDefinition[] = [
  {
    name: "pdf",
    description: "Renders the offer as a PDF document.",
    target: "offer",
  },
];
