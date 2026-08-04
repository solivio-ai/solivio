// Canonical domain models. Pure TS types + small constants; no runtime deps.
//
// `channels.ts` additionally declares the `offer` channel target and its slot
// props by merging into the SDK's open registries — a type-only reference to
// @solivio/sdk, which keeps that dependency pointing one way (the SDK never
// imports this package).

// Type-only: pulls the file into the program so its augmentations merge, without
// emitting a runtime import into a package that has none.
import type {} from "./channels";

export type { Customer, CustomerSource } from "./models/customer";
export {
  CustomerSelectionError,
  customerNamesMatch,
  normalizeCustomerName,
} from "./models/customer-selection";
export type {
  MatchSource,
  Offer,
  OfferItem,
  OfferKbArticle,
  OfferStatus,
  OfferUnmatchedItem,
  OfferUnmatchedItemInput,
} from "./models/offer";
export { OFFER_STATUS } from "./models/offer";
export type {
  OfferRevision,
  OfferRevisionSnapshot,
  OfferRevisionSnapshotItem,
} from "./models/offer-revision";
export type { Product, ProductSource } from "./models/product";
export type { ProductPrice } from "./models/product-price";
export type { CustomerRequest, RequestSource } from "./models/request";
export type { WorkflowStatus, WorkflowStep } from "./models/workflow";
export { workflowSteps } from "./models/workflow";
