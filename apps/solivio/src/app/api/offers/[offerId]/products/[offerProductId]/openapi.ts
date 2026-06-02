import { defineRouteOpenApi } from "@/server/api/openapi";
import {
  errorResponseSchema,
  offerProductPathParamsSchema,
  offerResponseSchema,
  updateOfferLineItemRequestSchema,
} from "@/server/api/schemas";

export {
  errorResponseSchema,
  offerProductPathParamsSchema,
  offerResponseSchema,
  updateOfferLineItemRequestSchema,
};

export const openapi = defineRouteOpenApi({
  PATCH: {
    operationId: "updateOfferProduct",
    summary: "Update an offer line item",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerProductPathParamsSchema,
    requestBody: {
      description: "New quantity for the offer line item.",
      required: true,
      schema: updateOfferLineItemRequestSchema,
    },
    responses: {
      200: {
        description: "The offer after updating the line item.",
        schema: offerResponseSchema,
      },
      400: "The request body was invalid.",
      403: "The offer has been accepted and cannot be modified.",
      404: "The offer or line item was not found.",
    },
  },
  DELETE: {
    operationId: "deleteOfferProduct",
    summary: "Remove an offer line item",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerProductPathParamsSchema,
    responses: {
      204: {
        description: "The line item was removed.",
      },
      403: "The offer has been accepted and cannot be modified.",
      404: "The offer or line item was not found.",
    },
  },
});
