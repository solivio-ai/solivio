// Barrel re-export. Per-table definitions live in `./schema/*`.
// Drizzle picks up all exported tables via the path configured in `drizzle.config.ts`.

// Module-owned tables (re-exported from the generated barrel so drizzle-kit
// and the typed db client see the full schema).
export * from "../../generated/schema";
export { accounts, sessions, users, verifications } from "./schema/auth";
export { offerChatMessages, offerChatThreads } from "./schema/offer-chat";
export { offerItems } from "./schema/offer-items";
export { offerRevisions } from "./schema/offer-revisions";
export { offers } from "./schema/offers";
export { productPrices } from "./schema/product-prices";
export { products } from "./schema/products";
