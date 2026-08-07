import { z } from "zod";

import { pdfResponse, routeGroup } from "@solivio/sdk/contracts";

const offerPdfPathParamsSchema = z
  .object({
    offerId: z.uuid(),
  })
  .strict()
  .meta({ id: "OfferPdfPathParams" });

const offerPdfQuerySchema = z
  .object({
    download: z.enum(["1"]).optional(),
  })
  .strict()
  .meta({
    id: "OfferPdfQuery",
    description: "Set download=1 to return the document as an attachment.",
  });

/**
 * The render route lives here rather than in the offers module: this module owns
 * the rendering, and the offers module owns no PDF surface at all. See
 * `docs/adr/0005-channels-output-capability.md`.
 */
export const routes = [
  ...routeGroup({ tag: "Documents", requiresAuth: true }, [
    {
      method: "get",
      path: "/api/offer-pdf/{offerId}",
      operationId: "getOfferPdf",
      summary: "Render a finalized offer as a PDF",
      description:
        "Loads the offer by id and renders it. Available when this module is the bound `offer` channel.",
      requestParams: offerPdfPathParamsSchema,
      requestQuery: offerPdfQuerySchema,
      responses: {
        200: pdfResponse("The rendered offer document."),
        404: "The offer was not found.",
      },
    },
  ]),
] as const satisfies readonly import("@solivio/sdk/contracts").ApiContract[];
