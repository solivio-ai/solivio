import { defineRouteOpenApi } from "@/server/api/openapi";
import {
  errorResponseSchema,
  offerPathParamsSchema,
  offerValidationResponseSchema,
} from "@/server/api/schemas";

export { errorResponseSchema, offerPathParamsSchema, offerValidationResponseSchema };

export const openapi = defineRouteOpenApi({
  POST: {
    operationId: "validateOffer",
    summary: "Validate an offer against its source request",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    responses: {
      200: {
        description: "AI validation result for the offer.",
        schema: offerValidationResponseSchema,
      },
      404: "The offer was not found.",
      422: "The offer does not have a source customer request to validate against.",
    },
  },
});
