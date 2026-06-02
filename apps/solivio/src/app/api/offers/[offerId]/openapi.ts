import { defineRouteOpenApi } from "@/server/api/openapi";
import {
  errorResponseSchema,
  offerPathParamsSchema,
  offerResponseSchema,
  updateOfferRequestSchema,
} from "@/server/api/schemas";

export {
  errorResponseSchema,
  offerPathParamsSchema,
  offerResponseSchema,
  updateOfferRequestSchema,
};

export const openapi = defineRouteOpenApi({
  GET: {
    operationId: "getOffer",
    summary: "Get an offer",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    responses: {
      200: {
        description: "The requested offer.",
        schema: offerResponseSchema,
      },
      404: "The offer was not found.",
    },
  },
  PATCH: {
    operationId: "updateOffer",
    summary: "Update an offer",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    requestBody: {
      description: "Review edits to apply to the offer.",
      required: true,
      schema: updateOfferRequestSchema,
    },
    responses: {
      200: {
        description: "The updated offer.",
        schema: offerResponseSchema,
      },
      400: "The request body did not match the offer update contract.",
      403: "The offer has been accepted and cannot be modified.",
      404: "The offer was not found.",
    },
  },
  DELETE: {
    operationId: "deleteOffer",
    summary: "Delete an offer",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    responses: {
      204: {
        description: "The offer was deleted.",
      },
      404: "The offer was not found.",
    },
  },
});
