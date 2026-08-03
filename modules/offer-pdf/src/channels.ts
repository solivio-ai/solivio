import type { DocumentProps } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { createElement } from "react";

import type { AnyChannelDefinition, ChannelDefinition } from "@solivio/sdk";

import { OfferDocument } from "./components/OfferDocument.tsx";
import { buildPdfOfferPayload } from "./lib/buildPdfOfferPayload.ts";

/**
 * Renders a finalized offer into a PDF.
 *
 * `createElement` rather than JSX so this stays a `.ts` file: the generated
 * channel registry imports it from the app's server bundle, and keeping the
 * capability entry point free of JSX avoids dragging the module's tsx pipeline
 * into that path. The document itself is JSX, in `components/OfferDocument.tsx`.
 */
export const offerPdfChannel: ChannelDefinition<"offer"> = {
  name: "pdf",
  description: "Renders the offer as a PDF document.",
  target: "offer",
  run: async ({ offer }) => {
    const payload = buildPdfOfferPayload(offer);
    const buffer = await renderToBuffer(
      createElement(OfferDocument, { data: payload }) as ReactElement<DocumentProps>,
    );
    return {
      kind: "document",
      // Slashes in an offer number would break Content-Disposition.
      filename: `oferta-${payload.offer.number.replace(/\//g, "-")}.pdf`,
      contentType: "application/pdf",
      body: new Uint8Array(buffer),
    };
  },
};

export const channels: AnyChannelDefinition[] = [offerPdfChannel];
