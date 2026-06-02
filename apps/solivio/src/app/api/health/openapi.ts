import { defineRouteOpenApi } from "@/server/api/openapi";
import { healthResponseSchema } from "@/server/api/schemas";

export { healthResponseSchema };

export const openapi = defineRouteOpenApi({
  GET: {
    operationId: "getHealth",
    summary: "Check service health",
    tags: ["System"],
    responses: {
      200: {
        description: "The app is reachable and reports database readiness.",
        schema: healthResponseSchema,
      },
    },
  },
});
