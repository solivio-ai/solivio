import { defineRouteOpenApi, pdfResponse } from "@/server/api/openapi";
import { errorResponseSchema, offerPdfRequestSchema } from "@/server/api/schemas";

export { errorResponseSchema, offerPdfRequestSchema };

export const openapi = defineRouteOpenApi({
  GET: {
    operationId: "getSampleOfferPdf",
    summary: "Render sample offer PDF",
    tags: ["Documents"],
    responses: {
      200: pdfResponse("A sample offer PDF."),
    },
  },
  POST: {
    operationId: "renderOfferPdf",
    summary: "Render offer PDF from payload",
    tags: ["Documents"],
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
});
