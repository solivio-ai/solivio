# offer-pdf module

Provides the **PDF channel** for the `offer` target: the accepted-offer screen's
document preview and download action, plus the route that renders them. No tables,
no pages, no services. Extracted out of `offers` when channels became a real
capability kind — see `docs/adr/0005-channels-output-capability.md`.

- **Declaration:** `src/channels.ts` exports `channels: ChannelDefinition[]` with
  one entry named `pdf`, bound in `solivio.config.ts` as
  `"offer.channel": "offer-pdf/pdf"`. It declares *that* this module is the offer
  destination; it has no `run` and the core never invokes it.
- **UI:** `src/slots.tsx` fills `offer-detail.document` (inline preview) and
  `offer-detail.actions` (download button). Both receive the whole `Offer`. The
  preview renders only while this module is the bound channel (the host passes
  `providerId`); the button is additive and renders alongside other modules'
  actions regardless of the binding.
- **Route:** `GET /api/offer-pdf/{offerId}` renders the document
  (`?download=1` for an attachment).
- **Depends on `offers`** for `getService("offers").getOffer(id)`. Rendering runs
  on the server, so it needs a route, and that route re-fetches by id rather than
  trusting the offer its own slot components hold client-side.

## The rule that matters here

**Never accept the offer as a request body.** Slot props live in the browser and
can be edited. This module renders whatever it is given, so trusting a posted
offer would let any session render forged prices — and for a destination that
transmits somewhere, forged data would leave the building.

## Layout

| Path | Role |
|------|------|
| `src/channels.ts` | The channel declaration (name/description/target only) |
| `src/api/offer-pdf/[offerId]/route.tsx` | Loads the offer by id, renders, streams |
| `src/lib/renderOfferPdf.ts` | `Offer` → `{ filename, contentType, body }` (`createElement`, no JSX, so it stays `.ts`) |
| `src/components/OfferDocument.tsx` | The `@react-pdf/renderer` document |
| `src/components/OfferDocumentSlot.tsx` | `offer-detail.document` fill — the inline preview |
| `src/components/PdfViewer.tsx` | Client viewer (`react-pdf`) for the served bytes |
| `src/components/DownloadPdfButton.tsx` | `offer-detail.actions` fill |
| `src/lib/schema.ts` | `pdfOfferRequestSchema` — the payload contract the document types derive from (`z.infer`) |
| `src/lib/buildPdfOfferPayload.ts` | `Offer` → payload |
| `src/lib/calculateTotals.ts` | Money maths (decimal.js) |
| `src/lib/formatters.ts` | Locale/currency formatting |
| `src/contracts/routes.ts` | OpenAPI contract for the render route |

## Notes

- The seller block in `buildPdfOfferPayload.ts` is still **hardcoded demo data**
  (name, address, NIP), as it was inside offers. Real seller identity wants
  deployment config; it did not change with the extraction.
- **Rendering has no automated coverage.** `lib/renderOfferPdf.test.ts` stubs
  `renderToBuffer`, because @react-pdf's reconciler needs React client internals
  that are absent under the `react-server` resolve condition vitest uses for
  server modules. Layout changes must be checked by opening an accepted offer.
- The route never checks offer status — any offer this user may read can be
  rendered, draft included. That matches the old behaviour and is deliberate for
  now (salespeople preview drafts), but a destination that transmits outward
  should gate on status itself.
- After changing files here: `yarn generate && yarn check && yarn typecheck`.
