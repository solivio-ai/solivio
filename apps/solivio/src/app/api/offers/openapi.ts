import { defineRouteOpenApi } from "@/server/api/openapi";
import {
  createdOfferResponseSchema,
  createOfferRequestSchema,
  errorResponseSchema,
} from "@/server/api/schemas";

export { createdOfferResponseSchema, createOfferRequestSchema, errorResponseSchema };

export const openapi = defineRouteOpenApi({
  POST: {
    operationId: "generateOffer",
    summary: "Generate a draft offer",
    description: "AI-assisted offer generation backed by the products table.",
    tags: ["Offers"],
    requiresAuth: true,
    requestBody: {
      description: "Customer name and request text for the new offer.",
      required: false,
      schema: createOfferRequestSchema,
    },
    responses: {
      201: {
        description: "A newly persisted draft offer.",
        schema: createdOfferResponseSchema,
      },
      400: "The request body could not be parsed or validated.",
      500: "The server could not generate the offer.",
    },
  },
});
