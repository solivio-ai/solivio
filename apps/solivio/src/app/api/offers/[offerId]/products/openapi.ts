import { defineRouteOpenApi } from "@/server/api/openapi";
import {
  addOfferProductRequestSchema,
  errorResponseSchema,
  offerPathParamsSchema,
  offerResponseSchema,
} from "@/server/api/schemas";

export {
  addOfferProductRequestSchema,
  errorResponseSchema,
  offerPathParamsSchema,
  offerResponseSchema,
};

export const openapi = defineRouteOpenApi({
  POST: {
    operationId: "addOfferProduct",
    summary: "Add a product to an offer",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    requestBody: {
      description: "Product and quantity to add as an offer line.",
      required: true,
      schema: addOfferProductRequestSchema,
    },
    responses: {
      201: {
        description: "The offer after adding the line item.",
        schema: offerResponseSchema,
      },
      400: "The request body was invalid.",
      403: "The offer has been accepted and cannot be modified.",
      404: "The offer or product was not found.",
      409: "The product is already in the offer.",
    },
  },
});
