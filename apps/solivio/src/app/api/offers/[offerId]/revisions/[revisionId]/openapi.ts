import { defineRouteOpenApi } from "@/server/api/openapi";
import {
  errorResponseSchema,
  offerRevisionPathParamsSchema,
  offerRevisionResponseSchema,
} from "@/server/api/schemas";

export { errorResponseSchema, offerRevisionPathParamsSchema, offerRevisionResponseSchema };

export const openapi = defineRouteOpenApi({
  GET: {
    operationId: "getOfferRevision",
    summary: "Get an offer revision",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerRevisionPathParamsSchema,
    responses: {
      200: {
        description: "The requested offer revision.",
        schema: offerRevisionResponseSchema,
      },
      404: "The revision was not found.",
    },
  },
});
