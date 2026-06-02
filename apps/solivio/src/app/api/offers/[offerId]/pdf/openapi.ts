import { defineRouteOpenApi, pdfResponse } from "@/server/api/openapi";
import {
  errorResponseSchema,
  offerPathParamsSchema,
  offerPdfQuerySchema,
} from "@/server/api/schemas";

export { errorResponseSchema, offerPathParamsSchema, offerPdfQuerySchema };

export const openapi = defineRouteOpenApi({
  GET: {
    operationId: "getOfferPdf",
    summary: "Render persisted offer PDF",
    tags: ["Documents"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    requestQuery: offerPdfQuerySchema,
    responses: {
      200: pdfResponse("The rendered PDF for the persisted offer."),
      400: "The PDF query parameters were invalid.",
      404: "The offer was not found.",
    },
  },
});
