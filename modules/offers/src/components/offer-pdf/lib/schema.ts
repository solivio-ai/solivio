import { z } from "zod";

export const offerMetaSchema = z.object({
  number: z.string(),
  issueDate: z.string().date(),
  validUntil: z.string().date(),
  currency: z.string().min(1),
  discountPercent: z.number().min(0).max(100).default(0),
});

export const partySchema = z.object({
  name: z.string(),
  address: z.string(),
  nip: z.string().optional(),
  contact: z.string().optional(),
});

export const offerItemSchema = z.object({
  sku: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  quantity: z.number().positive(),
  unit: z.string().default("szt."),
  unitPriceNet: z.number().nonnegative(),
  vatRate: z.number().min(0).max(1),
});

export const offerTermsSchema = z.object({
  delivery: z.string().optional(),
  payment: z.string().optional(),
  notes: z.string().optional(),
});

export const pdfOfferRequestSchema = z.object({
  offer: offerMetaSchema,
  seller: partySchema,
  buyer: partySchema,
  items: z.array(offerItemSchema).min(1),
  terms: offerTermsSchema.optional(),
});

export type OfferMeta = z.infer<typeof offerMetaSchema>;
export type Party = z.infer<typeof partySchema>;
export type OfferItem = z.infer<typeof offerItemSchema>;
export type OfferTerms = z.infer<typeof offerTermsSchema>;
export type PdfOfferRequest = z.infer<typeof pdfOfferRequestSchema>;
