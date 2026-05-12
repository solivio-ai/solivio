import { z } from "zod";

export const authPathParamsSchema = z
  .object({
    authPath: z.string(),
  })
  .strict()
  .meta({
    id: "AuthPathParams",
    description: "Catch-all path segment delegated to Better Auth.",
  });

export const offerPathParamsSchema = z
  .object({
    offerId: z.string(),
  })
  .strict()
  .meta({ id: "OfferPathParams" });

export const offerProductPathParamsSchema = z
  .object({
    offerId: z.string(),
    offerProductId: z.string(),
  })
  .strict()
  .meta({ id: "OfferProductPathParams" });

export const offerRevisionPathParamsSchema = z
  .object({
    offerId: z.string(),
    revisionId: z.string(),
  })
  .strict()
  .meta({ id: "OfferRevisionPathParams" });

export const offerChatMessagesPathParamsSchema = z
  .object({
    offerId: z.string(),
    threadId: z.string(),
  })
  .strict()
  .meta({ id: "OfferChatMessagesPathParams" });

export const offerPdfQuerySchema = z
  .object({
    download: z.enum(["1"]).optional(),
  })
  .strict()
  .meta({
    id: "OfferPdfQuery",
    description: "Set download=1 to return the PDF as an attachment.",
  });
