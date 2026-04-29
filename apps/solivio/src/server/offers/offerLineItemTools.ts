import "server-only";

import { tool } from "ai";
import { z } from "zod";

import {
  addProductToOffer,
  removeOfferLineItem,
  toOfferDomain,
  updateOfferLineItem
} from "./offerService";

export const offerLineItemTools = {
  add_product_to_offer: tool({
    description:
      "Add a product to an offer by its database UUID. Call this only after you have a valid productId from a product search result. Use when the user asks to add a product to the current offer.",
    inputSchema: z.object({
      offerId: z.string().uuid().describe("ID of the offer to add the product to"),
      productId: z.string().uuid().describe("ID of the product to add"),
      quantity: z.number().int().positive().describe("Number of units to add"),
      userId: z.string().describe("ID of the user making the change"),
      requestItem: z
        .string()
        .optional()
        .describe("The original customer request text this product fulfills")
    }),
    execute: async (input) => {
      const offer = await addProductToOffer(
        input.offerId,
        input.productId,
        input.quantity,
        input.requestItem,
        input.userId
      );
      if (offer === null) return { error: "not_found" };
      if (offer === "duplicate") return { error: "duplicate_product" };
      return { offer: toOfferDomain(offer) };
    }
  }),

  update_offer_line_item: tool({
    description:
      "Update the quantity of a product in an offer. Use when the user asks to change how many units of a product are in the offer. The productId is the product's database UUID, not the line item ID.",
    inputSchema: z.object({
      offerId: z.string().uuid().describe("ID of the offer containing the product"),
      productId: z.string().uuid().describe("ID of the product whose quantity to update"),
      quantity: z.number().int().positive().describe("New quantity"),
      userId: z.string().describe("ID of the user making the change")
    }),
    execute: async (input) => {
      const offer = await updateOfferLineItem(
        input.productId,
        input.offerId,
        input.quantity,
        input.userId
      );
      if (!offer) return { error: "not_found" };
      return { offer: toOfferDomain(offer) };
    }
  }),

  remove_offer_line_item: tool({
    description:
      "Remove a product from an offer. Use when the user asks to remove or delete a product from the offer.",
    inputSchema: z.object({
      offerId: z.string().uuid().describe("ID of the offer to remove the product from"),
      productId: z.string().uuid().describe("ID of the product to remove"),
      userId: z.string().describe("ID of the user making the change")
    }),
    execute: async (input) => {
      const removed = await removeOfferLineItem(input.productId, input.offerId, input.userId);
      if (!removed) return { error: "not_found" };
      return { success: true };
    }
  })
};
