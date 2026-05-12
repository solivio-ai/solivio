import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { offers } from "./offers";

export const offerChatThreads = pgTable(
  "offer_chat_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offers.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New chat"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("offer_chat_messages_thread_id_idx").on(table.threadId),
    index("offer_chat_messages_created_at_idx").on(table.createdAt),
  ],
);
