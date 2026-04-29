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
      "Add a product to an offer. Use this when the user asks to add a product by ID to the current offer.",
    inputSchema: z.object({
      offerId: z.string().uuid().describe("ID of the offer to add the product to"),
      productId: z.string().uuid().describe("ID of the product to add"),
      quantity: z.number().int().positive().describe("Number of units to add"),
      requestItem: z
        .string()
        .optional()
        .describe("The customer request item this product fulfills")
    }),
    execute: async (input) => {
      const offer = await addProductToOffer(
        input.offerId,
        input.productId,
        input.quantity,
        input.requestItem
      );
      if (!offer) return { error: "not_found" };
      return { offer: toOfferDomain(offer) };
    }
  }),

  update_offer_line_item: tool({
    description:
      "Update the quantity of a specific line item in an offer. Use this when the user asks to change how many units of a product are in the offer.",
    inputSchema: z.object({
      offerId: z.string().uuid().describe("ID of the offer containing the line item"),
      offerProductId: z.string().uuid().describe("ID of the line item to update"),
      quantity: z.number().int().positive().describe("New quantity for the line item")
    }),
    execute: async (input) => {
      const offer = await updateOfferLineItem(input.offerProductId, input.offerId, input.quantity);
      if (!offer) return { error: "not_found" };
      return { offer: toOfferDomain(offer) };
    }
  }),

  remove_offer_line_item: tool({
    description:
      "Remove a product line item from an offer. Use this when the user asks to remove or delete a product from the offer.",
    inputSchema: z.object({
      offerId: z.string().uuid().describe("ID of the offer to remove the line item from"),
      offerProductId: z.string().uuid().describe("ID of the line item to remove")
    }),
    execute: async (input) => {
      const removed = await removeOfferLineItem(input.offerProductId, input.offerId);
      if (!removed) return { error: "not_found" };
      return { success: true };
    }
  })
};
