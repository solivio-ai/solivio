import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { index, integer, pgTable, real, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { timestamps } from "@solivio/sdk/db";

import { halfvec } from "./halfvec.ts";

// ---------------------------------------------------------------------------
// Spaces — top-level navigation units, each owns a dedicated map canvas.
// Source metadata (origin/external_id/synced_at) is present from day one so
// adapter-synced data (Confluence, Notion, …) can coexist with manual entries
// without a schema migration.
// ---------------------------------------------------------------------------
export const knowledgeBaseSpaces = pgTable("knowledge_base_spaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"),
  icon: text("icon"),
  // source metadata — null for manually created spaces
  origin: text("origin"),
  externalId: text("external_id"),
  syncedAt: timestamps.createdAt, // reuse timestamp type; nullable via default override below
  ...timestamps,
});

// ---------------------------------------------------------------------------
// Articles — nodes within a space; self-referencing parent forms the tree.
// position_x/y are null when auto-layout governs placement on the map canvas;
// a drag sets them to fixed coordinates.
// ---------------------------------------------------------------------------
export const knowledgeBaseArticles = pgTable(
  "knowledge_base_articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => knowledgeBaseSpaces.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => knowledgeBaseArticles.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    type: text("type")
      .$type<"article" | "directive" | "template" | "policy" | "note">()
      .notNull()
      .default("article"),
    sortOrder: integer("sort_order").notNull().default(0),
    positionX: real("position_x"),
    positionY: real("position_y"),
    // source metadata — null for manually created articles
    origin: text("origin"),
    externalId: text("external_id"),
    syncedAt: timestamps.createdAt,
    ...timestamps,
  },
  (table) => [
    index("knowledge_base_articles_space_id_idx").on(table.spaceId),
    index("knowledge_base_articles_parent_id_idx").on(table.parentId),
  ],
);

// ---------------------------------------------------------------------------
// Connections — typed directed links between any two articles (cross-space ok).
// ---------------------------------------------------------------------------
export const knowledgeBaseConnections = pgTable(
  "knowledge_base_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromId: uuid("from_id")
      .notNull()
      .references(() => knowledgeBaseArticles.id, { onDelete: "cascade" }),
    toId: uuid("to_id")
      .notNull()
      .references(() => knowledgeBaseArticles.id, { onDelete: "cascade" }),
    type: text("type")
      .$type<"related" | "prerequisite" | "contradicts" | "supersedes">()
      .notNull()
      .default("related"),
    ...timestamps,
  },
  (table) => [
    index("knowledge_base_connections_from_id_idx").on(table.fromId),
    index("knowledge_base_connections_to_id_idx").on(table.toId),
    uniqueIndex("knowledge_base_connections_unique_idx").on(table.fromId, table.toId, table.type),
  ],
);

// ---------------------------------------------------------------------------
// Tags — flat labels on articles (many-to-many via join rows).
// ---------------------------------------------------------------------------
export const knowledgeBaseArticleTags = pgTable(
  "knowledge_base_article_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => knowledgeBaseArticles.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
    ...timestamps,
  },
  (table) => [
    index("knowledge_base_article_tags_article_id_idx").on(table.articleId),
    uniqueIndex("knowledge_base_article_tags_unique_idx").on(table.articleId, table.tag),
  ],
);

// ---------------------------------------------------------------------------
// Embeddings — one halfvec row per article; populated by the import job and
// article save handler (Phase 4). Separate table keeps the articles table lean
// and allows model swaps without touching article rows.
// ---------------------------------------------------------------------------
export const knowledgeBaseEmbeddings = pgTable(
  "knowledge_base_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => knowledgeBaseArticles.id, { onDelete: "cascade" })
      .unique(),
    model: text("model").notNull(),
    vector: halfvec("vector", { dimensions: 3072 }),
    ...timestamps,
  },
  (table) => [
    index("knowledge_base_embeddings_vector_idx").using(
      "hnsw",
      table.vector.op("halfvec_cosine_ops"),
    ),
  ],
);
