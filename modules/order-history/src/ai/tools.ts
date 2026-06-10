// Type-side wiring for dependsOn modules (erased at runtime).

import { z } from "zod";

import type {} from "@solivio/module-offers/services.ts";
import type { AgentTool } from "@solivio/sdk";
import { defineAgentTool } from "@solivio/sdk";
import { getService } from "@solivio/sdk/runtime";

const recallOrderHistory = defineAgentTool({
  name: "recall_order_history",
  agents: ["chat-agent", "offer-generation-agent"],
  description:
    "Retrieve this customer's recent past orders with their line items. " +
    "Use this when the user refers to previous purchases, asks for 'same as last time', " +
    "wants to repeat an order, or asks what this customer usually orders. " +
    "Returns orders sorted newest-first, including product names, quantities, and prices. ",
  parameters: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe("How many past orders to retrieve (default 5, max 20)"),
  }),
  execute: async (input, ctx) => {
    if (!ctx.customerId) {
      return { orders: [], count: 0, note: "No customer in scope for this request." };
    }
    const orders = await getService("offers").recentOffersForCustomer({
      customerId: ctx.customerId,
      limit: input.limit ?? 5,
    });
    return { orders, count: orders.length };
  },
});

export const tools: AgentTool[] = [recallOrderHistory];
