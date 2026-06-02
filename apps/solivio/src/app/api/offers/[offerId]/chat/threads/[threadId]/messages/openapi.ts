import { defineRouteOpenApi } from "@/server/api/openapi";
import {
  errorResponseSchema,
  offerChatMessagesPathParamsSchema,
  offerChatMessagesResponseSchema,
} from "@/server/api/schemas";

export { errorResponseSchema, offerChatMessagesPathParamsSchema, offerChatMessagesResponseSchema };

export const openapi = defineRouteOpenApi({
  GET: {
    operationId: "listOfferChatMessages",
    summary: "List offer chat messages",
    tags: ["Chat"],
    requiresAuth: true,
    requestParams: offerChatMessagesPathParamsSchema,
    responses: {
      200: {
        description: "Messages in the offer chat thread.",
        schema: offerChatMessagesResponseSchema,
      },
      404: "The chat thread was not found for the offer.",
    },
  },
});
