import "server-only";

import { createTool } from "@voltagent/core";
import { z } from "zod";

import {
  searchProductsByPrompt,
  searchProductsBatch,
} from "../products/productSearchService";
import {
  addProductToOffer,
  bulkAddProductsToOffer,
  removeOfferLineItem,
  toOfferDomain,
  updateOfferLineItem,
} from "./offerService";

export const offerLineItemTools = [
  createTool({
    name: "search_products",
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
    execute: async (input) => {
      const matches = await searchProductsByPrompt(input.query, {
        limit: input.limit ?? 10,
        minSimilarity: 0.2,
      });
      return { products: matches ?? [] };
    },
  }),

  createTool({
    name: "add_product_to_offer",
    description:
      "Add a product to an offer by its exact UUID. Only call this after you have resolved the product ID — use search_products first if the user gave a name or description instead of an ID.",
    parameters: z.object({
      offerId: z
        .string()
        .uuid()
        .describe("ID of the offer to add the product to"),
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
    execute: async (input) => {
      const offer = await addProductToOffer(
        input.offerId,
        input.productId,
        input.quantity,
        input.requestItem,
        undefined,
        input.rationale,
      );
      if (offer === null) return { error: "not_found" };
      if (offer === "duplicate") return { error: "duplicate_product" };
      if (offer === "locked") return { error: "offer_locked" };
      return { offer: toOfferDomain(offer) };
    },
  }),

  createTool({
    name: "update_offer_line_item",
    description:
      "Update the quantity of a specific line item in an offer. Use this when the user asks to change how many units of a product are in the offer.",
    parameters: z.object({
      offerId: z
        .string()
        .uuid()
        .describe("ID of the offer containing the line item"),
      offerProductId: z
        .string()
        .uuid()
        .describe("ID of the line item to update"),
      quantity: z
        .number()
        .int()
        .positive()
        .describe("New quantity for the line item"),
    }),
    execute: async (input) => {
      const offer = await updateOfferLineItem(input.offerProductId, input.offerId, input.quantity);
      if (offer === "locked") return { error: "offer_locked" };
      if (offer === null) return { error: "not_found" };
      return { offer: toOfferDomain(offer) };
    },
  }),

  createTool({
    name: "remove_offer_line_item",
    description:
      "Remove a product line item from an offer. Use this when the user asks to remove or delete a product from the offer.",
    parameters: z.object({
      offerId: z
        .string()
        .uuid()
        .describe("ID of the offer to remove the line item from"),
      offerProductId: z
        .string()
        .uuid()
        .describe("ID of the line item to remove"),
    }),
    execute: async (input) => {
      const removed = await removeOfferLineItem(
        input.offerProductId,
        input.offerId,
      );
      if (removed === "locked") return { error: "offer_locked" };
      if (!removed) return { error: "not_found" };
      return { success: true };
    },
  }),

  createTool({
    name: "propose_products_for_requirements",
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
    execute: async (input) => {
      const resultsMap = await searchProductsBatch(input.requirements, {
        limit: input.limit ?? 3,
        minSimilarity: 0.6,
      });

      const proposals = input.requirements.map((requirement) => {
        const matches = resultsMap.get(requirement) ?? [];
        return { requirement, matches, hasMatch: matches.length > 0 };
      });

      const unmatchedRequirements = proposals
        .filter((p) => !p.hasMatch)
        .map((p) => p.requirement);

      return { proposals, unmatchedRequirements };
    },
  }),

  createTool({
    name: "bulk_add_products",
    description:
      "Add multiple products to an offer in a single call. Use this after propose_products_for_requirements when the user confirms which products to add, or when adding several products at once from resolved product UUIDs.",
    parameters: z.object({
      offerId: z
        .string()
        .uuid()
        .describe("ID of the offer to add the products to"),
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
    execute: async (input) => {
      const result = await bulkAddProductsToOffer(input.offerId, input.items);
      return result;
    },
  }),
];
