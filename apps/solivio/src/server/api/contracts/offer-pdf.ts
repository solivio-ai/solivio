import { pdfOfferRequestSchema } from "../../../features/offer-pdf/lib/schema";

export const offerPdfRequestSchema = pdfOfferRequestSchema.meta({
  id: "OfferPdfRequest",
  description: "Offer payload rendered into a PDF document.",
});
