import { z } from "zod";

import { pdfResponse, routeGroup } from "@solivio/sdk/contracts";

import { pdfOfferRequestSchema } from "../components/offer-pdf/lib/schema.ts";
import { offerPathParamsSchema } from "./offer.ts";

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

export const documentRoutes = [
  ...routeGroup({ tag: "Documents" }, [
    {
      method: "get",
      path: "/api/offers/pdf",
      operationId: "getSampleOfferPdf",
      summary: "Render sample offer PDF",
      responses: {
        200: pdfResponse("A sample offer PDF."),
      },
    },
    {
      method: "post",
      path: "/api/offers/pdf",
      operationId: "renderOfferPdf",
      summary: "Render offer PDF from payload",
      requestBody: {
        description: "Offer document payload to render.",
        required: true,
        schema: offerPdfRequestSchema,
      },
      responses: {
        200: pdfResponse("The rendered offer PDF."),
        400: "The PDF payload was invalid.",
      },
    },
  ]),
  ...routeGroup({ tag: "Documents", requiresAuth: true }, [
    {
      method: "get",
      path: "/api/offers/{offerId}/pdf",
      operationId: "getOfferPdf",
      summary: "Render persisted offer PDF",
      requestParams: offerPathParamsSchema,
      requestQuery: offerPdfQuerySchema,
      responses: {
        200: pdfResponse("The rendered PDF for the persisted offer."),
        404: "The offer was not found.",
      },
    },
  ]),
] as const satisfies readonly import("@solivio/sdk/contracts").ApiContract[];
