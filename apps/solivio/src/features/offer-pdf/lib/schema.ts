import { z } from "zod";

export const pdfOfferMetaSchema = z
  .object({
    number: z.string(),
    issueDate: z.string().date(),
    validUntil: z.string().date(),
    currency: z.string().min(1),
    discountPercent: z.number().min(0).max(100).default(0),
  })
  .meta({ id: "OfferPdfMeta" });

export const pdfPartySchema = z
  .object({
    name: z.string(),
    address: z.string(),
    nip: z.string().optional(),
    contact: z.string().optional(),
  })
  .meta({ id: "OfferPdfParty" });

export const pdfOfferItemSchema = z
  .object({
    sku: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
    quantity: z.number().positive(),
    unit: z.string().default("szt."),
    unitPriceNet: z.number().nonnegative(),
    vatRate: z.number().min(0).max(1),
  })
  .meta({ id: "OfferPdfItem" });

export const pdfOfferTermsSchema = z
  .object({
    delivery: z.string().optional(),
    payment: z.string().optional(),
    notes: z.string().optional(),
  })
  .meta({ id: "OfferPdfTerms" });

export const pdfOfferRequestSchema = z
  .object({
    offer: pdfOfferMetaSchema,
    seller: pdfPartySchema,
    buyer: pdfPartySchema,
    items: z.array(pdfOfferItemSchema).min(1),
    terms: pdfOfferTermsSchema.optional(),
  })
  .meta({
    id: "OfferPdfRequest",
    description: "Offer payload rendered into a PDF document.",
  });

export type OfferMeta = z.infer<typeof pdfOfferMetaSchema>;
export type Party = z.infer<typeof pdfPartySchema>;
export type OfferItem = z.infer<typeof pdfOfferItemSchema>;
export type OfferTerms = z.infer<typeof pdfOfferTermsSchema>;
export type PdfOfferRequest = z.infer<typeof pdfOfferRequestSchema>;
