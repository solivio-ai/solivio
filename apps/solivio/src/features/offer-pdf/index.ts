export { OfferDocument } from "./components/OfferDocument";
export { sampleOffer } from "./fixtures/sampleOffer";
export { calculateTotals, calculateItemTotals } from "./lib/calculateTotals";
export { pdfOfferRequestSchema } from "./lib/schema";
export type { PdfOfferRequest, OfferItem, Party, OfferMeta, OfferTerms } from "./lib/schema";
export type { ItemWithTotals, OfferTotals } from "./lib/calculateTotals";
