import { defineRouteOpenApi } from "@/server/api/openapi";
import {
  errorResponseSchema,
  offerRevisionPathParamsSchema,
  restoreOfferRevisionResponseSchema,
} from "@/server/api/schemas";

export { errorResponseSchema, offerRevisionPathParamsSchema, restoreOfferRevisionResponseSchema };

export const openapi = defineRouteOpenApi({
  POST: {
    operationId: "restoreOfferRevision",
    summary: "Restore an offer revision",
    tags: ["Offers"],
    requiresAuth: true,
    requestParams: offerRevisionPathParamsSchema,
    responses: {
      200: {
        description: "The restored offer and the revision created by the restore action.",
        schema: restoreOfferRevisionResponseSchema,
      },
      404: "The revision was not found.",
    },
  },
});
