import { defineRouteOpenApi } from "@/server/api/openapi";
import {
  createOfferChatThreadRequestSchema,
  errorResponseSchema,
  offerChatThreadResponseSchema,
  offerChatThreadsResponseSchema,
  offerPathParamsSchema,
} from "@/server/api/schemas";

export {
  createOfferChatThreadRequestSchema,
  errorResponseSchema,
  offerChatThreadResponseSchema,
  offerChatThreadsResponseSchema,
  offerPathParamsSchema,
};

export const openapi = defineRouteOpenApi({
  GET: {
    operationId: "listOfferChatThreads",
    summary: "List offer chat threads",
    tags: ["Chat"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    responses: {
      200: {
        description: "Chat threads attached to the offer.",
        schema: offerChatThreadsResponseSchema,
      },
      404: "The offer was not found.",
    },
  },
  POST: {
    operationId: "createOfferChatThread",
    summary: "Create an offer chat thread",
    tags: ["Chat"],
    requiresAuth: true,
    requestParams: offerPathParamsSchema,
    requestBody: {
      description: "Optional chat thread title.",
      required: false,
      schema: createOfferChatThreadRequestSchema,
    },
    responses: {
      201: {
        description: "The created chat thread.",
        schema: offerChatThreadResponseSchema,
      },
      400: "The request body was invalid.",
      404: "The offer was not found.",
    },
  },
});
