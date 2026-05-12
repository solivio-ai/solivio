import { index, integer, jsonb, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import type { OfferRevisionSnapshot } from "@solivio/domain";

import { offers } from "./offers";

export const offerRevisions = pgTable(
  "offer_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offers.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    snapshot: jsonb("snapshot").$type<OfferRevisionSnapshot>().notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("offer_revisions_offer_id_idx").on(table.offerId),
    uniqueIndex("offer_revisions_offer_revision_unique").on(table.offerId, table.revisionNumber),
  ],
);
