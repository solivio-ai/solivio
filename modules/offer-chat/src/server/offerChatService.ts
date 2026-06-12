import "server-only";

import type { UIMessage } from "ai";
import { and, asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@solivio/sdk/runtime";

import { offerChatMessages, offerChatThreads } from "../data/schema.ts";

export type OfferChatThread = {
  id: string;
  offerId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

function toThread(row: typeof offerChatThreads.$inferSelect): OfferChatThread {
  return {
    id: row.id,
    offerId: row.offerId,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function titleFromMessage(message: UIMessage) {
  const text = message.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();

  if (!text) return "New chat";
  return text.length > 48 ? `${text.slice(0, 45)}...` : text;
}

export async function listOfferChatThreads(offerId: string) {
  const rows = await db
    .select()
    .from(offerChatThreads)
    .where(eq(offerChatThreads.offerId, offerId))
    .orderBy(desc(offerChatThreads.updatedAt), desc(offerChatThreads.createdAt));

  return rows.map(toThread);
}

export async function createOfferChatThread(offerId: string, title = "New chat") {
  const [thread] = await db.insert(offerChatThreads).values({ offerId, title }).returning();

  return toThread(thread);
}

export async function getOfferChatThread(offerId: string, threadId: string) {
  const [thread] = await db
    .select()
    .from(offerChatThreads)
    .where(and(eq(offerChatThreads.offerId, offerId), eq(offerChatThreads.id, threadId)))
    .limit(1);

  return thread ? toThread(thread) : null;
}

export async function getOfferChatMessages(threadId: string): Promise<UIMessage[]> {
  const rows = await db
    .select()
    .from(offerChatMessages)
    .where(eq(offerChatMessages.threadId, threadId))
    .orderBy(asc(offerChatMessages.createdAt));

  return rows.map((row) => ({
    id: row.id,
    role: row.role as UIMessage["role"],
    parts: row.parts as UIMessage["parts"],
  }));
}

export async function appendOfferChatMessage(threadId: string, message: UIMessage) {
  await db
    .insert(offerChatMessages)
    .values({
      id: message.id,
      threadId,
      role: message.role,
      parts: message.parts,
    })
    .onConflictDoNothing();

  if (message.role === "user") {
    await db
      .update(offerChatThreads)
      .set({
        updatedAt: new Date(),
        title: sql`case when ${offerChatThreads.title} = 'New chat' then ${titleFromMessage(message)} else ${offerChatThreads.title} end`,
      })
      .where(eq(offerChatThreads.id, threadId));
    return;
  }

  await db
    .update(offerChatThreads)
    .set({ updatedAt: new Date() })
    .where(eq(offerChatThreads.id, threadId));
}
