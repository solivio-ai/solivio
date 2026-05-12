/**
 * Renderers are output-surface capabilities a module can expose.
 * They turn an accepted offer snapshot into an artifact (PDF, DOCX, JSON, plain text).
 * Pure: snapshot in, artifact out — no side effects, no canonical writes.
 */

import type { OfferSnapshot } from "./entities/offer.js";

export interface RendererDefinition {
  /** Unique name for this renderer, e.g. "pdf". */
  name: string;
  /** File format identifier, e.g. "pdf", "docx". */
  format: string;
  /** MIME type of the produced artifact, e.g. "application/pdf". */
  mimeType: string;
  render: (snapshot: OfferSnapshot) => Promise<Uint8Array>;
}
