import { z } from "zod";

import type { AgentTool, AgentToolContext } from "@solivio/sdk";
import { defineAgentTool } from "@solivio/sdk";
import { getService } from "@solivio/sdk/runtime";

/**
 * The salesperson copilot's offer-editing + catalog tools, contributed to the
 * generated agent-tool registry. Services are resolved lazily at execution
 * time through the SDK runtime.
 */
const products = {
  search: (query: string, opts?: { limit?: number; minSimilarity?: number }) =>
    getService("catalog").searchByPrompt(query, opts),
  searchBatch: async (queries: string[], opts?: { limit?: number; minSimilarity?: number }) =>
    Object.fromEntries(await getService("catalog").searchBatch(queries, opts)),
};
const offers = {
  addProduct: (...args: Parameters<Services_offers["addProduct"]>) =>
    getService("offers").addProduct(...args),
  updateLineItem: (...args: Parameters<Services_offers["updateLineItem"]>) =>
    getService("offers").updateLineItem(...args),
  removeLineItem: (...args: Parameters<Services_offers["removeLineItem"]>) =>
    getService("offers").removeLineItem(...args),
  bulkAddProducts: (...args: Parameters<Services_offers["bulkAddProducts"]>) =>
    getService("offers").bulkAddProducts(...args),
};
type Services_offers = import("../services.ts").OffersService;

function createOfferTools(): AgentTool[] {
  const searchProducts = defineAgentTool({
    name: "search_products",
    agents: ["chat-agent"],
    description:
      "Search the product catalog using a natural-language query and return the best semantic matches. Use this to discover product IDs before adding them to an offer.",
    parameters: z.object({
      query: z
        .string()
        .min(1)
        .describe("Natural-language description of the product to search for"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe("Maximum number of results to return (default 5, max 20)"),
    }),
    execute: async (input, _ctx: AgentToolContext) => {
      const matches = await products.search(input.query, {
        limit: input.limit ?? 10,
        minSimilarity: 0.2,
      });
      return { products: matches };
    },
  });

  const addProduct = defineAgentTool({
    name: "add_product_to_offer",
    agents: ["chat-agent"],
    description:
      "Add a product to an offer by its exact UUID. Only call this after you have resolved the product ID — use search_products first if the user gave a name or description instead of an ID.",
    parameters: z.object({
      offerId: z.string().uuid().describe("ID of the offer to add the product to"),
      productId: z.string().uuid().describe("ID of the product to add"),
      quantity: z.number().int().positive().describe("Number of units to add"),
      requestItem: z
        .string()
        .optional()
        .describe("The customer request item this product fulfills"),
      rationale: z
        .string()
        .optional()
        .describe("Brief explanation of why this product matches the requirement"),
    }),
    execute: async (input, _ctx: AgentToolContext) => {
      const result = await offers.addProduct(input.offerId, {
        productId: input.productId,
        quantity: input.quantity,
        requestItem: input.requestItem,
        rationale: input.rationale,
      });
      switch (result.status) {
        case "ok":
          return { offer: result.offer };
        case "duplicate":
          return { error: "duplicate_product" };
        case "locked":
          return { error: "offer_locked" };
        default:
          return { error: "not_found" };
      }
    },
  });

  const updateLineItem = defineAgentTool({
    name: "update_offer_line_item",
    agents: ["chat-agent"],
    description:
      "Update the quantity of a specific line item in an offer. Use this when the user asks to change how many units of a product are in the offer.",
    parameters: z.object({
      offerId: z.string().uuid().describe("ID of the offer containing the line item"),
      offerProductId: z.string().uuid().describe("ID of the line item to update"),
      quantity: z.number().int().positive().describe("New quantity for the line item"),
    }),
    execute: async (input, _ctx: AgentToolContext) => {
      const result = await offers.updateLineItem(
        input.offerId,
        input.offerProductId,
        input.quantity,
      );
      switch (result.status) {
        case "ok":
          return { offer: result.offer };
        case "locked":
          return { error: "offer_locked" };
        default:
          return { error: "not_found" };
      }
    },
  });

  const removeLineItem = defineAgentTool({
    name: "remove_offer_line_item",
    agents: ["chat-agent"],
    description:
      "Remove a product line item from an offer. Use this when the user asks to remove or delete a product from the offer.",
    parameters: z.object({
      offerId: z.string().uuid().describe("ID of the offer to remove the line item from"),
      offerProductId: z.string().uuid().describe("ID of the line item to remove"),
    }),
    execute: async (input, _ctx: AgentToolContext) => {
      const result = await offers.removeLineItem(input.offerId, input.offerProductId);
      switch (result.status) {
        case "ok":
          return { success: true };
        case "locked":
          return { error: "offer_locked" };
        default:
          return { error: "not_found" };
      }
    },
  });

  const proposeProducts = defineAgentTool({
    name: "propose_products_for_requirements",
    agents: ["chat-agent"],
    description:
      "Given a list of natural-language product requirements, search the catalog for the best match for each one and return a structured proposal. Use this when the user describes multiple product needs at once, or when the user asks you to suggest or propose products without immediately adding them. Present the results to the user before adding anything.",
    parameters: z.object({
      requirements: z
        .array(z.string().min(1))
        .min(1)
        .describe("List of distinct product requirements to search for"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(5)
        .optional()
        .describe("Maximum number of catalog matches to return per requirement (default 3, max 5)"),
    }),
    execute: async (input, _ctx: AgentToolContext) => {
      const resultsMap = await products.searchBatch(input.requirements, {
        limit: input.limit ?? 3,
        minSimilarity: 0.6,
      });
      const proposals = input.requirements.map((requirement) => {
        const matches = resultsMap[requirement] ?? [];
        return { requirement, matches, hasMatch: matches.length > 0 };
      });
      const unmatchedRequirements = proposals.filter((p) => !p.hasMatch).map((p) => p.requirement);
      return { proposals, unmatchedRequirements };
    },
  });

  const bulkAdd = defineAgentTool({
    name: "bulk_add_products",
    agents: ["chat-agent"],
    description:
      "Add multiple products to an offer in a single call. Use this after propose_products_for_requirements when the user confirms which products to add, or when adding several products at once from resolved product UUIDs.",
    parameters: z.object({
      offerId: z.string().uuid().describe("ID of the offer to add the products to"),
      items: z
        .array(
          z.object({
            productId: z.string().uuid().describe("ID of the product to add"),
            quantity: z.number().int().positive().describe("Number of units to add"),
            requestItem: z
              .string()
              .optional()
              .describe("The customer request item this product fulfills"),
            rationale: z
              .string()
              .optional()
              .describe("Brief explanation of why this product matches the requirement"),
          }),
        )
        .min(1)
        .describe("List of products to add"),
    }),
    execute: async (input) => offers.bulkAddProducts(input.offerId, input.items),
  });

  return [searchProducts, addProduct, updateLineItem, removeLineItem, proposeProducts, bulkAdd];
}

export const tools: AgentTool[] = createOfferTools();
