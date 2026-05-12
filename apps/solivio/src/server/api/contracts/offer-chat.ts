import { z } from "zod";

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
