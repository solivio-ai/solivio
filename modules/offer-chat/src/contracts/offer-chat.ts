import { z } from "zod";

const offerPathParamsSchema = z
  .object({
    offerId: z.string(),
  })
  .strict()
  .meta({ id: "ChatOfferPathParams" });

import { routeGroup, sseResponse } from "@solivio/sdk/contracts";

export const offerChatMessagesPathParamsSchema = z
  .object({
    offerId: z.string(),
    threadId: z.string(),
  })
  .strict()
  .meta({ id: "OfferChatMessagesPathParams" });

export const offerChatThreadSchema = z
  .object({
    id: z.string(),
    offerId: z.string(),
    title: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict()
  .meta({
    id: "OfferChatThread",
    description: "Persisted chat thread attached to an offer.",
  });

export const offerChatThreadsResponseSchema = z
  .object({
    threads: z.array(offerChatThreadSchema),
  })
  .strict()
  .meta({ id: "OfferChatThreadsResponse" });

export const createOfferChatThreadRequestSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
  })
  .strict()
  .meta({ id: "CreateOfferChatThreadRequest" });

export const offerChatThreadResponseSchema = z
  .object({
    thread: offerChatThreadSchema,
  })
  .strict()
  .meta({ id: "OfferChatThreadResponse" });

export const uiMessagePartSchema = z.record(z.string(), z.unknown()).meta({
  id: "UiMessagePart",
  description: "AI SDK UI message part.",
});

export const uiMessageSchema = z
  .object({
    id: z.string().optional(),
    role: z.string(),
    parts: z.array(uiMessagePartSchema),
  })
  .passthrough()
  .meta({
    id: "UiMessage",
    description: "AI SDK UI message.",
  });

export const offerChatMessagesResponseSchema = z
  .object({
    messages: z.array(uiMessageSchema),
  })
  .strict()
  .meta({ id: "OfferChatMessagesResponse" });

export const chatRequestSchema = z
  .object({
    messages: z.array(uiMessageSchema),
    offerId: z.string().optional(),
    threadId: z.string().optional(),
  })
  .strict()
  .meta({
    id: "ChatRequest",
    description:
      "AI SDK chat request. offerId and threadId must be provided together when persisting messages.",
  });

export const chatRoutes = [
  ...routeGroup({ tag: "Chat", requiresAuth: true }, [
    {
      method: "post",
      path: "/api/chat",
      operationId: "streamChat",
      summary: "Stream assistant chat",
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
    {
      method: "get",
      path: "/api/offers/{offerId}/chat/threads",
      operationId: "listOfferChatThreads",
      summary: "List offer chat threads",
      requestParams: offerPathParamsSchema,
      responses: {
        200: {
          description: "Chat threads attached to the offer.",
          schema: offerChatThreadsResponseSchema,
        },
        404: "The offer was not found.",
      },
    },
    {
      method: "post",
      path: "/api/offers/{offerId}/chat/threads",
      operationId: "createOfferChatThread",
      summary: "Create an offer chat thread",
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
        404: "The offer was not found.",
      },
    },
    {
      method: "get",
      path: "/api/offers/{offerId}/chat/threads/{threadId}/messages",
      operationId: "listOfferChatMessages",
      summary: "List offer chat messages",
      requestParams: offerChatMessagesPathParamsSchema,
      responses: {
        200: {
          description: "Messages in the offer chat thread.",
          schema: offerChatMessagesResponseSchema,
        },
        404: "The chat thread was not found for the offer.",
      },
    },
  ]),
] as const satisfies readonly import("@solivio/sdk/contracts").ApiContract[];
