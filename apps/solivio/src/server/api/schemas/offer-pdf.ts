import { z } from "zod";

import { pdfOfferRequestSchema } from "../../../features/offer-pdf/lib/schema";

export const offerPdfQuerySchema = z
  .object({
    download: z.enum(["1"]).optional(),
  })
  .strict()
  .meta({
    id: "OfferPdfQuery",
    description: "Set download=1 to return the PDF as an attachment.",
  });

export const offerPdfRequestSchema = pdfOfferRequestSchema.meta({
  id: "OfferPdfRequest",
  description: "Offer payload rendered into a PDF document.",
});
