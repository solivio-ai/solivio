import { defineRouteOpenApi } from "@/server/api/openapi";
import {
  createdOfferResponseSchema,
  errorResponseSchema,
  quickOfferRequestSchema,
} from "@/server/api/schemas";

export { createdOfferResponseSchema, errorResponseSchema, quickOfferRequestSchema };

export const openapi = defineRouteOpenApi({
  POST: {
    operationId: "createQuickOffer",
    summary: "Create a quick offer",
    tags: ["Offers"],
    requiresAuth: true,
    requestBody: {
      description: "Manual product selections to turn into a draft offer.",
      required: true,
      schema: quickOfferRequestSchema,
    },
    responses: {
      201: {
        description: "A newly persisted manual offer.",
        schema: createdOfferResponseSchema,
      },
      400: "No product selections or customer were provided.",
    },
  },
});
