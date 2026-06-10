// CORE-owned tables only (module-owned tables live in modules/<id>/src/data/schema.ts
// with their own migration journals). Drizzle diffs core tables via this barrel;
// the runtime client in ./db.ts merges in the generated module schema barrel.
export { accounts, sessions, users, verifications } from "./schema/auth";
export { offerChatMessages, offerChatThreads } from "./schema/offer-chat";
export { offerItems } from "./schema/offer-items";
export { offerRevisions } from "./schema/offer-revisions";
export { offers } from "./schema/offers";
export { productPrices } from "./schema/product-prices";
export { products } from "./schema/products";
