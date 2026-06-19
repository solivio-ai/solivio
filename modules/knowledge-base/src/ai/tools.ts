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
    "Search the knowledge base for compatibility information, installation guides, policies, technical specifications, and sales playbook content. " +
    "Use this when the user asks how products work together, how to install something, what policies apply, or needs context beyond the product catalog. " +
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
        "Restrict search to a specific knowledge base space. Use browse_knowledge_base first to identify the right space.",
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

const browseKnowledgeBase = defineAgentTool({
  name: "browse_knowledge_base",
  agents: ["offer-generation-agent", "chat-agent"],
  description:
    "Returns the structure of the knowledge base — spaces and their article trees (titles and types only, no body content). " +
    "Use this to orient yourself before searching: identify which space is relevant, then pass its spaceId to search_knowledge_base to scope the search.",
  parameters: z.object({
    spaceId: z
      .string()
      .uuid()
      .optional()
      .describe("Return the tree for a single space. Omit to list all spaces with their trees."),
  }),
  execute: async (input) => {
    const log = getLogger("knowledge-base");
    log.info("browse_knowledge_base called", { spaceId: input.spaceId });
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
          articles: articles.map((a) => ({
            id: a.id,
            title: a.title,
            type: a.type,
            parentId: a.parentId,
          })),
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
    "Use this after search_knowledge_base identifies a relevant article and you need the complete content to answer the user.",
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
