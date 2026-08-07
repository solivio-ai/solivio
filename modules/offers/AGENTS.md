# offers module

Owns the offer lifecycle: drafts, line items, revisions, the
generation/name/validation agents, the copilot's offer-editing agent tools,
and ALL offer-facing UI (dashboard "/", /offers, /offers/new, /offers/[offerId],
/offers/demo — including the chat panel UI, which integrates imperatively with
the review screen; the chat DOMAIN lives in the offer-chat module and is
reached over HTTP).

- **Tables (owned):** `offers`, `offers_items`, `offers_revisions` (own journal in
  `src/data/migrations`). Cross-module references (customer_id, request_id,
  user_id, product_id) are id-only — display data is fetched through services
  (`customers`, `catalog`, `users`), never SQL joins on foreign tables.
- **Public API:** `offers` service (`getService("offers")`): generateOffer (runs
  the offer-generation agent, no persistence — also the benchmark entrypoint),
  getOffer, getDraft, recentOffersForCustomer, addProduct, updateLineItem,
  removeLineItem, bulkAddProducts.
- **Agent tools:** `src/ai/tools.ts` contributes the copilot tools to the
  generated registry (consumed by offer-chat's agent via getAgentTools()).
- **Slots hosted:** the dashboard page hosts `<Slot id="dashboard.cards" />`.
  `OfferAcceptedView` hosts two slots for modules that act on a finalized offer,
  both handing over the whole `Offer`:
  - `offer-detail.document` (a preview, e.g. a PDF) — **exclusive**, passing
    `providerId` resolved server-side (`getChannelProvider("offer")` in
    `[offerId]/page.tsx`), so only the module backing the bound `offer` channel
    renders even with other channel modules enabled.
  - `offer-detail.actions` (e.g. "Download PDF", "Export to …") — **additive**,
    every contributing module's button renders, no binding needed.

  Offers hosts these slots but is ignorant of what fills them, and owns no
  document surface of its own — each provider owns its own routes.
- **Events emitted:** `offers.offer.created` and `offers.offer.accepted` (after
  commit, on a real transition only — see `server/offerService.ts`). Acceptance
  is the hook for modules that act on a finalized offer without a user click.
- Per-role agent model ids come from `getAi().modelFor(role)`.
- After changes: `yarn generate && yarn check && yarn typecheck`.
