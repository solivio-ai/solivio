import { z } from "zod";

import type { AgentTool } from "@solivio/sdk";
import { defineAgentTool } from "@solivio/sdk";
import { getLogger } from "@solivio/sdk/runtime";

import {
  findAllSpaces,
  findArticleById,
  findArticlesBySpace,
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
    "Returns all knowledge base spaces with their full nested article trees (titles and types only, no body content). " +
    "Call this first — with no arguments — to see what spaces exist and identify which one is relevant. " +
    "Then pass the spaceId from the result to search_knowledge_base to scope the search.",
  parameters: z.object({}),
  execute: async (_input) => {
    const log = getLogger("knowledge-base");
    log.info("browse_knowledge_base called");
    const spaces = await findAllSpaces();

    const tree = await Promise.all(
      spaces.map(async (space) => {
        const articles = await findArticlesBySpace(space.id);
        return {
          spaceId: space.id,
          spaceName: space.name,
          spaceDescription: space.description,
          articles: buildArticleTree(articles),
        };
      }),
    );

    function countNodes(nodes: ArticleNode[]): number {
      return nodes.reduce((n, a) => n + 1 + countNodes(a.children), 0);
    }
    log.info("browse_knowledge_base returned", {
      spaces: tree.length,
      totalArticles: tree.reduce((n, s) => n + countNodes(s.articles), 0),
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
