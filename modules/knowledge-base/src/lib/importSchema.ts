import { z } from "zod";

/**
 * Canonical JSON format for knowledge base imports.
 * Accepts either a nested tree (children arrays) or a flat list with
 * parentExternalId — adapters may produce either shape; the import job
 * flattens nested trees before upserting.
 */

const articleTypeEnum = z.enum(["article", "directory", "directive", "template", "policy", "note"]);

const connectionSchema = z.object({
  toExternalId: z.string(),
  type: z.enum(["related", "prerequisite", "contradicts", "supersedes"]).default("related"),
});

// Recursive article type via z.lazy.
export type ImportArticle = {
  externalId?: string;
  parentExternalId?: string;
  title: string;
  body: string;
  type: z.infer<typeof articleTypeEnum>;
  sortOrder: number;
  tags: string[];
  connections: Array<z.infer<typeof connectionSchema>>;
  children?: ImportArticle[];
};

export const importArticleSchema: z.ZodType<ImportArticle> = z.lazy(() =>
  z.object({
    externalId: z.string().optional(),
    parentExternalId: z.string().optional(),
    title: z.string().min(1),
    body: z.string().default(""),
    type: articleTypeEnum.default("article"),
    sortOrder: z.number().int().default(0),
    tags: z.array(z.string()).default([]),
    connections: z.array(connectionSchema).default([]),
    children: z.array(importArticleSchema).optional(),
  }),
);

export const importSpaceSchema = z.object({
  externalId: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  articles: z.array(importArticleSchema).default([]),
});

export const importPayloadSchema = z.object({
  origin: z.string().default("json-import"),
  spaces: z.array(importSpaceSchema).min(1),
});

export type ImportSpace = z.infer<typeof importSpaceSchema>;
export type ImportPayload = z.infer<typeof importPayloadSchema>;

// ---------------------------------------------------------------------------
// Flatten nested children into a flat list with parentExternalId wiring.
// ---------------------------------------------------------------------------

export function flattenArticles(
  articles: ImportArticle[],
  parentExternalId?: string,
  prefix = "",
): ImportArticle[] {
  const flat: ImportArticle[] = [];
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i]!;
    const externalId = article.externalId ?? `${prefix}${i}`;
    flat.push({ ...article, externalId, parentExternalId, children: undefined });
    if (article.children?.length) {
      flat.push(...flattenArticles(article.children, externalId, `${externalId}.`));
    }
  }
  return flat;
}

export function flattenPayload(payload: ImportPayload): ImportPayload {
  return {
    ...payload,
    spaces: payload.spaces.map((space) => ({
      ...space,
      articles: flattenArticles(space.articles),
    })),
  };
}
