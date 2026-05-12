// Canonical domain models. Pure TS types + small constants. No infra deps.

export type { Customer, CustomerSource } from "./models/customer";
export type { MatchSource, Offer, OfferItem, OfferStatus } from "./models/offer";
export type {
  OfferRevision,
  OfferRevisionSnapshot,
  OfferRevisionSnapshotItem,
} from "./models/offer-revision";
export type { Product, ProductImportRow, ProductSource } from "./models/product";
export type { ProductPrice } from "./models/product-price";
export type { CustomerRequest, RequestSource } from "./models/request";
export type { WorkflowStatus, WorkflowStep } from "./models/workflow";
export { workflowSteps } from "./models/workflow";
