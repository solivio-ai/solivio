import { defineRouteOpenApi } from "@/server/api/openapi";
import {
  errorResponseSchema,
  offerPathParamsSchema,
  offerRevisionResponseSchema,
  offerRevisionsResponseSchema,
} from "@/server/api/schemas";

export {
  errorResponseSchema,
  offerPathParamsSchema,
  offerRevisionResponseSchema,
  offerRevisionsResponseSchema,
};

export const openapi = defineRouteOpenApi({
  GET: {
    operationId: "listOfferRevisions",
    summary: "List offer revisions",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    responses: {
      200: {
        description: "Revision history for the offer.",
        schema: offerRevisionsResponseSchema,
      },
    },
  },
  POST: {
    operationId: "saveOfferRevision",
    summary: "Save an offer revision",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    responses: {
      201: {
        description: "The saved offer revision.",
        schema: offerRevisionResponseSchema,
      },
      404: "The offer was not found.",
    },
  },
});
