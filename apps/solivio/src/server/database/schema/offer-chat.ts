import { index, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { offers } from "./offers";
import { timestamps } from "./timestamps";

export const offerChatThreads = pgTable(
  "offer_chat_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offers.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New chat"),
    ...timestamps,
  },
  (table) => [
    index("offer_chat_threads_offer_id_idx").on(table.offerId),
    index("offer_chat_threads_created_at_idx").on(table.createdAt),
  ],
);

export const offerChatMessages = pgTable(
  "offer_chat_messages",
  {
    id: text("id").primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => offerChatThreads.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    parts: jsonb("parts").notNull(),
    ...timestamps,
  },
  (table) => [
    index("offer_chat_messages_thread_id_idx").on(table.threadId),
    index("offer_chat_messages_created_at_idx").on(table.createdAt),
  ],
);
