import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { Offer, OfferRevisionSnapshot } from "@solivio/domain";

// ── pgvector half-precision vector ─────────────────────────────────────────────

const halfvec = customType<{ data: number[]; driverData: string; config: { dimensions: number } }>({
  dataType(config) {
    return `halfvec(${config?.dimensions ?? 0})`;
  },
  toDriver(value) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value) {
    return value.slice(1, -1).split(",").map(Number);
  },
});

// ── Better Auth tables ─────────────────────────────────────────────────────────
// Renamed to plural to match domain naming convention.

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// ── Domain: customers ──────────────────────────────────────────────────────────

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  source: text("source").notNull().default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Domain: requests ───────────────────────────────────────────────────────────

export const requests = pgTable(
  "requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id").references(() => customers.id),
    rawText: text("raw_text").notNull(),
    source: text("source").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("requests_customer_id_idx").on(table.customerId)],
);

// ── Domain: products ───────────────────────────────────────────────────────────

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sku: text("sku").notNull().unique(),
    source: text("source").notNull().default("manual"),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    embedding: halfvec("embedding", { dimensions: 3072 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("products_embedding_idx").using("hnsw", table.embedding.op("halfvec_cosine_ops")),
  ],
);

// ── Domain: product_prices ─────────────────────────────────────────────────────

export const productPrices = pgTable(
  "product_prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    currency: text("currency").notNull(),
    net: numeric("net", { precision: 12, scale: 2, mode: "number" }).notNull(),
    gross: numeric("gross", { precision: 14, scale: 4, mode: "number" }).notNull(),
    vatRate: numeric("vat_rate", { precision: 5, scale: 2, mode: "number" }).notNull().default(23),
    source: text("source").notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("product_prices_product_id_idx").on(table.productId),
    uniqueIndex("product_prices_product_currency_unique").on(table.productId, table.currency),
  ],
);

// ── Domain: offers ─────────────────────────────────────────────────────────────

export const offers = pgTable(
  "offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id").references(() => customers.id),
    requestId: uuid("request_id").references(() => requests.id),
    userId: text("user_id").references(() => users.id),
    name: text("name").notNull().default("Draft"),
    status: text("status").$type<Offer["status"]>().notNull().default("draft"),
    currency: text("currency").notNull().default("PLN"),
    discountPercent: numeric("discount_percent", { precision: 5, scale: 2, mode: "number" })
      .notNull()
      .default(0),
    discountAmount: numeric("discount_amount", { precision: 12, scale: 2, mode: "number" })
      .notNull()
      .default(0),
    notes: text("notes").array().notNull().default([]),
    unmatched: text("unmatched").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("offers_discount_percent_range", sql`${table.discountPercent} BETWEEN 0 AND 100`),
    check("offers_discount_amount_nonneg", sql`${table.discountAmount} >= 0`),
    index("offers_customer_id_idx").on(table.customerId),
    index("offers_request_id_idx").on(table.requestId),
    index("offers_status_idx").on(table.status),
  ],
);

// ── Domain: offer_items ────────────────────────────────────────────────────────

export const offerItems = pgTable(
  "offer_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offers.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    quantity: numeric("quantity", { precision: 12, scale: 3, mode: "number" })
      .notNull()
      .default(1),
    unitPriceNet: numeric("unit_price_net", { precision: 12, scale: 2, mode: "number" })
      .notNull()
      .default(0),
    vatRate: numeric("vat_rate", { precision: 5, scale: 2, mode: "number" }).notNull().default(23),
    unitGrossPrice: numeric("unit_gross_price", { precision: 14, scale: 4, mode: "number" })
      .notNull()
      .default(0),
    totalNet: numeric("total_net", { precision: 14, scale: 4, mode: "number" }).notNull().default(0),
    totalGross: numeric("total_gross", { precision: 14, scale: 4, mode: "number" })
      .notNull()
      .default(0),
    requestItem: text("request_item").notNull().default(""),
    rationale: text("rationale").notNull().default(""),
    matchSource: text("match_source"),
    matchScore: numeric("match_score", { precision: 6, scale: 4, mode: "number" }),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("offer_items_offer_id_idx").on(table.offerId)],
);

// ── Domain: offer_revisions ────────────────────────────────────────────────────

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

// ── Domain: offer_chat_threads ─────────────────────────────────────────────────

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

// ── Domain: offer_chat_messages ────────────────────────────────────────────────

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
