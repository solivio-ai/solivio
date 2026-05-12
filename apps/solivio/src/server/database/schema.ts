// Barrel re-export. Per-table definitions live in `./schema/*`.
// Drizzle picks up all exported tables via the path configured in `drizzle.config.ts`.

export { accounts, sessions, users, verifications } from "./schema/auth";
export { customers } from "./schema/customers";
export { offerChatMessages, offerChatThreads } from "./schema/offer-chat";
export { offerItems } from "./schema/offer-items";
export { offerRevisions } from "./schema/offer-revisions";
export { offers } from "./schema/offers";
export { productPrices } from "./schema/product-prices";
export { products } from "./schema/products";
export { requests } from "./schema/requests";
