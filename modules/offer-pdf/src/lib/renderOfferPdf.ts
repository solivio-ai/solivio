import type { DocumentProps } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { createElement } from "react";

import type { Offer } from "@solivio/domain";

import { OfferDocument } from "../components/OfferDocument.tsx";
import { buildPdfOfferPayload } from "./buildPdfOfferPayload.ts";

/** A rendered offer document, ready to stream. */
export interface RenderedOfferPdf {
  filename: string;
  contentType: string;
  /**
   * `Uint8Array<ArrayBuffer>` (not the default `ArrayBufferLike`) so the body is
   * directly usable as a `BodyInit` — a shared-memory view is not.
   */
  body: Uint8Array<ArrayBuffer>;
}

/**
 * Renders a finalized offer into a PDF.
 *
 * `createElement` rather than JSX so this stays a `.ts` file and the render path
 * keeps no JSX of its own; the document itself is JSX, in
 * `components/OfferDocument.tsx`.
 */
export async function renderOfferPdf(offer: Offer): Promise<RenderedOfferPdf> {
  const payload = buildPdfOfferPayload(offer);
  const buffer = await renderToBuffer(
    createElement(OfferDocument, { data: payload }) as ReactElement<DocumentProps>,
  );
  return {
    // Slashes in an offer number would break Content-Disposition.
    filename: `oferta-${payload.offer.number.replace(/\//g, "-")}.pdf`,
    contentType: "application/pdf",
    body: new Uint8Array(buffer),
  };
}
