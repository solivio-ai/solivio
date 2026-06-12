# offers module

Owns the offer lifecycle: drafts, line items, revisions, PDF rendering, the
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
- **Slots:** the dashboard page hosts `<Slot id="dashboard.cards" />`.
- Per-role agent model ids come from `getAi().modelFor(role)`.
- After changes: `yarn generate && yarn check && yarn typecheck`.
