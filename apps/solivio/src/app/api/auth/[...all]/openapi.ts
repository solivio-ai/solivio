import { defineRouteOpenApi } from "@/server/api/openapi";
import { authPathParamsSchema } from "@/server/api/schemas";

export const openapi = defineRouteOpenApi({
  GET: {
    operationId: "handleBetterAuthGet",
    summary: "Handle Better Auth GET route",
    description:
      "Catch-all route delegated to Better Auth for session reads, provider callbacks, and other auth GET flows.",
    tags: ["Auth"],
    requestParams: authPathParamsSchema,
    responses: {
      200: { description: "Better Auth handled the GET request." },
      400: { description: "Better Auth rejected the request." },
    },
  },
  POST: {
    operationId: "handleBetterAuthPost",
    summary: "Handle Better Auth POST route",
    description:
      "Catch-all route delegated to Better Auth for sign-in, sign-up, sign-out, and other auth POST flows.",
    tags: ["Auth"],
    requestParams: authPathParamsSchema,
    responses: {
      200: { description: "Better Auth handled the POST request." },
      400: { description: "Better Auth rejected the request." },
    },
  },
});
