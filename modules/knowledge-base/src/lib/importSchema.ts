import { z } from "zod";

/**
 * Canonical JSON format for knowledge base imports.
 * This is the stable contract that future adapters (Confluence, Notion, Google
 * Drive, SharePoint) must produce — they transform their native format into
 * this shape, and the importer capability consumes it unchanged.
 */

export const importArticleSchema = z.object({
  /** Stable identifier within the source system; used for upsert dedup. */
  externalId: z.string().optional(),
  /** External id of the parent article within the same import payload. */
  parentExternalId: z.string().optional(),
  title: z.string().min(1),
  body: z.string().default(""),
  type: z.enum(["article", "directive", "template", "policy", "note"]).default("article"),
  sortOrder: z.number().int().default(0),
  tags: z.array(z.string()).default([]),
  connections: z
    .array(
      z.object({
        toExternalId: z.string(),
        type: z.enum(["related", "prerequisite", "contradicts", "supersedes"]).default("related"),
      }),
    )
    .default([]),
});

export const importSpaceSchema = z.object({
  /** Stable identifier within the source system. */
  externalId: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  articles: z.array(importArticleSchema).default([]),
});

export const importPayloadSchema = z.object({
  /** Human-readable name of the tool or script that produced this payload. */
  origin: z.string().default("json-import"),
  spaces: z.array(importSpaceSchema).min(1),
});

export type ImportArticle = z.infer<typeof importArticleSchema>;
export type ImportSpace = z.infer<typeof importSpaceSchema>;
export type ImportPayload = z.infer<typeof importPayloadSchema>;
