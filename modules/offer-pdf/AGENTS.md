# offer-pdf module

Headless capability module: provides the **PDF channel** for the `offer` target
(no tables, no pages, no services). Extracted out of `offers` when channels
became a real capability kind — see `docs/adr/0005-channels-output-capability.md`.

- **Capability:** `src/channels.ts` exports `channels: AnyChannelDefinition[]`
  with one provider named `pdf`, bound in `solivio.config.ts` as
  `"offer.channel": "offer-pdf/pdf"`.
- **Input:** the `Offer` domain type from `@solivio/domain`. That is what lets
  this module render an offer **without depending on `modules/offers/`** — do not
  add such a dependency, and do not reach for offers' internal types.
- **Output:** `{ kind: "document", filename, contentType: "application/pdf", body }`.
  The consumer (`/api/offers/{offerId}/pdf`, owned by offers) streams it.
- **No HTTP surface, no tables, no UI.** The channel is the module's only export
  to the rest of the system. A `/api/offer-pdf/preview` route (sample render +
  render-from-payload) existed briefly during the extraction and was removed: it
  had no caller, and it rendered PDFs unauthenticated.

## Layout

| Path | Role |
|------|------|
| `src/channels.ts` | The capability entry point (`createElement`, no JSX, so it stays `.ts`) |
| `src/components/OfferDocument.tsx` | The `@react-pdf/renderer` document |
| `src/lib/schema.ts` | `pdfOfferRequestSchema` — the payload contract the document types derive from (`z.infer`) |
| `src/lib/buildPdfOfferPayload.ts` | `Offer` → payload |
| `src/lib/calculateTotals.ts` | Money maths (decimal.js) |
| `src/lib/formatters.ts` | Locale/currency formatting |

## Notes

- The seller block in `buildPdfOfferPayload.ts` is still **hardcoded demo data**
  (name, address, NIP), as it was inside offers. Real seller identity wants
  deployment config; it did not change with the extraction.
- **Rendering has no automated coverage.** `channels.test.ts` stubs
  `renderToBuffer`, because @react-pdf's reconciler needs React client internals
  that are absent under the `react-server` resolve condition vitest uses for
  server modules. Layout changes must be checked by opening an accepted offer.
- `react-pdf` (the *viewer*) stays in `offers` — `PdfViewer` renders the served
  bytes in the accepted-offer screen and is unrelated to rendering.
- After changing files here: `yarn generate && yarn check && yarn typecheck`.
