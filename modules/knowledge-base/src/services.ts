import type { Services } from "@solivio/sdk";

import type { ImportPayload } from "./lib/importSchema.ts";
import type { ArticleRow, SpaceRow } from "./server/knowledgeBaseRepository.ts";
import {
  deleteArticle,
  findAllSpaces,
  findArticleById,
  findArticlesBySpace,
  findConnectionsByArticle,
  findConnectionsBySpace,
  findRootArticlesBySpace,
  findSpaceById,
  findTagsByArticle,
  insertArticle,
  insertSpace,
  setArticleTags,
  updateArticle,
  updateArticlePositions,
  upsertFromImport,
} from "./server/knowledgeBaseRepository.ts";

export type { ArticleRow, SpaceRow };

export interface KnowledgeBaseService {
  listSpaces(): Promise<SpaceRow[]>;
  findSpaceById(id: string): Promise<SpaceRow | null>;
  createSpace(input: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
  }): Promise<SpaceRow>;

  listArticles(spaceId: string): Promise<ArticleRow[]>;
  listRootArticles(spaceId: string): Promise<ArticleRow[]>;
  findArticleById(id: string): Promise<ArticleRow | null>;
  createArticle(input: {
    spaceId: string;
    parentId?: string;
    title: string;
    body?: string;
    type?: ArticleRow["type"];
    tags?: string[];
  }): Promise<ArticleRow>;
  updateArticle(
    id: string,
    input: {
      title?: string;
      body?: string;
      type?: ArticleRow["type"];
      parentId?: string | null;
      positionX?: number | null;
      positionY?: number | null;
    },
  ): Promise<ArticleRow | null>;
  deleteArticle(id: string): Promise<void>;

  findTagsByArticle(articleId: string): Promise<string[]>;
  findConnectionsByArticle(
    articleId: string,
  ): Promise<Array<{ id: string; fromId: string; toId: string; type: string }>>;
  listConnectionsBySpace(
    spaceId: string,
  ): Promise<Array<{ id: string; fromId: string; toId: string; type: string }>>;
  updateArticlePositions(updates: Array<{ id: string; x: number; y: number }>): Promise<void>;

  upsertFromImport(payload: ImportPayload): Promise<{
    spacesUpserted: number;
    articlesUpserted: number;
    errors: number;
  }>;
}

declare module "@solivio/sdk" {
  interface Services {
    "knowledge-base": KnowledgeBaseService;
  }
}

function createKnowledgeBaseService(): KnowledgeBaseService {
  return {
    listSpaces: () => findAllSpaces(),
    findSpaceById: (id) => findSpaceById(id),
    createSpace: (input) => insertSpace(input),

    listArticles: (spaceId) => findArticlesBySpace(spaceId),
    listRootArticles: (spaceId) => findRootArticlesBySpace(spaceId),
    findArticleById: (id) => findArticleById(id),
    async createArticle({ spaceId, parentId, title, body = "", type = "article", tags = [] }) {
      const article = await insertArticle({ spaceId, parentId, title, body, type });
      if (tags.length > 0) await setArticleTags(article.id, tags);
      return article;
    },
    updateArticle: (id, input) => updateArticle(id, input),
    deleteArticle: (id) => deleteArticle(id),

    findTagsByArticle: (articleId) => findTagsByArticle(articleId),
    findConnectionsByArticle: (articleId) => findConnectionsByArticle(articleId),
    listConnectionsBySpace: (spaceId) => findConnectionsBySpace(spaceId),
    updateArticlePositions: (updates) => updateArticlePositions(updates),

    upsertFromImport: (payload) => upsertFromImport(payload),
  };
}

export const services = {
  "knowledge-base": (_deps: Services) => createKnowledgeBaseService(),
};
