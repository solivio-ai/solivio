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
  `OfferAcceptedView` hosts two channel-scoped slots for modules that act on a
  finalized offer — `offer-detail.document` (a preview, e.g. the PDF) and
  `offer-detail.primaryAction` (what running the channel looks like, e.g.
  "Download PDF"). Both pass `providerId` resolved
  server-side (`getChannelProvider("offer")` in the `[offerId]/page.tsx`), so
  only the module backing the bound `offer` channel renders, even with other
  channel-providing modules also enabled. Offers hosts these slots but is
  ignorant of what fills them.
- Per-role agent model ids come from `getAi().modelFor(role)`.
- After changes: `yarn generate && yarn check && yarn typecheck`.
