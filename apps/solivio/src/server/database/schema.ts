import { boolean, index, pgTable, text, timestamp, uuid, vector } from "drizzle-orm/pg-core";

export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Better Auth tables ─────────────────────────────────────────────────────────
// Table names must match what Better Auth expects: "user", "session", "account", "verification"

export const user = pgTable("user", {
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

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
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

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sku: text("sku").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    manufacturer: text("manufacturer").notNull(),
    nameEmbedding: vector("name_embedding", { dimensions: 1536 }).notNull(),
    descriptionEmbedding: vector("description_embedding", { dimensions: 1536 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index("products_name_emb_idx").using("hnsw", table.nameEmbedding.op("vector_cosine_ops")),
    index("products_desc_emb_idx").using(
      "hnsw",
      table.descriptionEmbedding.op("vector_cosine_ops")
    )
  ]
);
