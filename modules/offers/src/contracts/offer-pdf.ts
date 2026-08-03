import { z } from "zod";

import { pdfResponse, routeGroup } from "@solivio/sdk/contracts";

import { offerPathParamsSchema } from "./offer.ts";

export const offerPdfQuerySchema = z
  .object({
    download: z.enum(["1"]).optional(),
  })
  .strict()
  .meta({
    id: "OfferPdfQuery",
    description: "Set download=1 to return the document as an attachment.",
  });

/**
 * Only the persisted-offer document route remains. The sample-render and
 * render-from-payload routes that used to sit on `/api/offers/pdf` were removed
 * with the PDF extraction — nothing called them, and they rendered PDFs
 * unauthenticated. See `docs/adr/0005-channels-output-capability.md`.
 */
export const documentRoutes = [
  ...routeGroup({ tag: "Documents", requiresAuth: true }, [
    {
      method: "get",
      path: "/api/offers/{offerId}/pdf",
      operationId: "getOfferPdf",
      summary: "Render persisted offer document",
      description:
        "Runs the offer channel configured for this deployment and returns the document it produces.",
      requestParams: offerPathParamsSchema,
      requestQuery: offerPdfQuerySchema,
      responses: {
        200: pdfResponse("The document rendered by the configured offer channel."),
        404: "The offer was not found.",
        500: "The configured offer channel does not produce a document.",
      },
    },
  ]),
] as const satisfies readonly import("@solivio/sdk/contracts").ApiContract[];
