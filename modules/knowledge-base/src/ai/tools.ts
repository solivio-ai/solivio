import { z } from "zod";

import type { AgentTool } from "@solivio/sdk";
import { defineAgentTool } from "@solivio/sdk";
import { getLogger } from "@solivio/sdk/runtime";

import {
  findAllSpaces,
  findArticleById,
  findArticlesBySpace,
  findSpaceById,
} from "../server/knowledgeBaseRepository.ts";
import { searchArticles } from "../server/knowledgeBaseSearchService.ts";

const searchKnowledgeBase = defineAgentTool({
  name: "search_knowledge_base",
  agents: ["offer-generation-agent", "chat-agent"],
  description:
    "Search the knowledge base using semantic similarity. Returns matching articles with their full body content — no need to call get_article separately. " +
    "Always call browse_knowledge_base FIRST to identify the relevant space, then pass its spaceId here to scope the search. " +
    "Do NOT use this for product lookup — use search_products for that.",
  parameters: z.object({
    query: z
      .string()
      .min(1)
      .describe("Natural-language question or description of what information is needed"),
    spaceId: z
      .string()
      .uuid()
      .optional()
      .describe(
        "Restrict search to a specific knowledge base space. Identify the right space with browse_knowledge_base first.",
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe("Maximum number of articles to return (default 5)"),
  }),
  execute: async (input) => {
    const log = getLogger("knowledge-base");
    log.info("search_knowledge_base called", {
      query: input.query,
      spaceId: input.spaceId,
      limit: input.limit,
    });
    const results = await searchArticles(input.query, {
      spaceId: input.spaceId,
      limit: input.limit ?? 5,
    });
    log.info("search_knowledge_base returned", {
      count: results.length,
      topScore: results[0]?.similarity,
    });
    return { results };
  },
});

type ArticleNode = { id: string; title: string; type: string; children: ArticleNode[] };

function buildArticleTree(
  articles: Array<{ id: string; title: string; type: string; parentId: string | null }>,
  maxDepth?: number,
): ArticleNode[] {
  const nodeMap = new Map<string, ArticleNode>();
  const roots: ArticleNode[] = [];

  for (const a of articles) {
    nodeMap.set(a.id, { id: a.id, title: a.title, type: a.type, children: [] });
  }
  for (const a of articles) {
    const node = nodeMap.get(a.id)!;
    if (a.parentId && nodeMap.has(a.parentId)) {
      nodeMap.get(a.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  if (maxDepth === undefined) return roots;

  function prune(nodes: ArticleNode[], depth: number): ArticleNode[] {
    return nodes.map((n) => ({
      ...n,
      children: depth >= maxDepth! ? [] : prune(n.children, depth + 1),
    }));
  }
  return prune(roots, 1);
}

const browseKnowledgeBase = defineAgentTool({
  name: "browse_knowledge_base",
  agents: ["offer-generation-agent", "chat-agent"],
  description:
    "CALL THIS FIRST before searching the knowledge base. Returns the full nested article tree for each space (titles and types, no body content). " +
    "Use the tree to identify which space is relevant, then pass its spaceId to search_knowledge_base to scope the search. " +
    "Skipping this step means searching blindly across all spaces and getting worse results.",
  parameters: z.object({
    spaceId: z
      .string()
      .uuid()
      .optional()
      .describe("Return the tree for a single space only. Omit to list all spaces."),
    depth: z
      .number()
      .int()
      .min(1)
      .max(5)
      .optional()
      .describe(
        "Maximum nesting depth to return (default: all levels). Use 2 for a compact overview of a large space.",
      ),
  }),
  execute: async (input) => {
    const log = getLogger("knowledge-base");
    log.info("browse_knowledge_base called", { spaceId: input.spaceId, depth: input.depth });
    const spaces = input.spaceId
      ? await findSpaceById(input.spaceId).then((s) => (s ? [s] : []))
      : await findAllSpaces();

    const tree = await Promise.all(
      spaces.map(async (space) => {
        const articles = await findArticlesBySpace(space.id);
        return {
          spaceId: space.id,
          spaceName: space.name,
          spaceDescription: space.description,
          articles: buildArticleTree(articles, input.depth),
        };
      }),
    );

    log.info("browse_knowledge_base returned", {
      spaces: tree.length,
      totalArticles: tree.reduce((n, s) => n + s.articles.length, 0),
    });
    return { spaces: tree };
  },
});

const getArticle = defineAgentTool({
  name: "get_article",
  agents: ["offer-generation-agent", "chat-agent"],
  description:
    "Retrieve the full body of a knowledge base article by its ID. " +
    "search_knowledge_base already returns full article bodies, so use this only when you have an article ID from browse_knowledge_base and want its content directly.",
  parameters: z.object({
    articleId: z.string().uuid().describe("ID of the article to retrieve"),
  }),
  execute: async (input) => {
    const log = getLogger("knowledge-base");
    log.info("get_article called", { articleId: input.articleId });
    const article = await findArticleById(input.articleId);
    if (!article) {
      log.warn("get_article: article not found", { articleId: input.articleId });
      return { error: "not_found" };
    }
    return {
      article: {
        id: article.id,
        title: article.title,
        body: article.body,
        type: article.type,
        spaceId: article.spaceId,
        parentId: article.parentId,
      },
    };
  },
});

export const tools: AgentTool[] = [searchKnowledgeBase, browseKnowledgeBase, getArticle];
