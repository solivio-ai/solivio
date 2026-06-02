import { defineRouteOpenApi, sseResponse } from "@/server/api/openapi";
import { chatRequestSchema, errorResponseSchema } from "@/server/api/schemas";

export { chatRequestSchema, errorResponseSchema };

export const openapi = defineRouteOpenApi({
  POST: {
    operationId: "streamChat",
    summary: "Stream assistant chat",
    tags: ["Chat"],
    requiresAuth: true,
    requestBody: {
      description: "AI SDK messages plus optional persistent offer chat identifiers.",
      required: true,
      schema: chatRequestSchema,
    },
    responses: {
      200: sseResponse("Server-sent event stream of AI SDK UI message chunks."),
      400: "Only one of offerId or threadId was provided.",
      404: "The persistent chat thread was not found.",
    },
  },
});
