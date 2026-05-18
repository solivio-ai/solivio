import "server-only";

import { Agent, createTool } from "@voltagent/core";
import { Output } from "ai";
import { z } from "zod";

import { searchProductsByPrompt } from "../products/productSearchService";
import { getModelFor } from "./modelConfig";
import { voltOpsClient } from "./voltOpsClient";

const agentResponseSchema = z.object({
  answer: z.string().min(1),
});

export async function searchProductsWithVoltAgent(prompt: string, limit = 5) {
  const products = await searchProductsByPrompt(prompt, { limit });

  const searchProductsTool = createTool({
    name: "search_products",
    description:
      "Returns the semantic product matches that were retrieved from the embedded products table for the active user prompt.",
    parameters: z.object({}).strict(),
    outputSchema: z.object({
      prompt: z.string(),
      products: z.array(
        z.object({
          id: z.string(),
          sku: z.string(),
          name: z.string(),
          description: z.string(),
          similarity: z.number(),
        }),
      ),
    }),
    execute: async () => ({
      prompt,
      products,
    }),
  });

  const agent = new Agent({
    name: "product-search-agent",
    instructions: [
      "You help a sales team shortlist products from the Solivio catalog.",
      "Always call the search_products tool before answering.",
      "Only reference products returned by that tool.",
      "Answer in the same language as the user's prompt.",
      "Keep the answer concise and practical for a salesperson.",
    ].join(" "),
    model: getModelFor("productSearch"),
    tools: [searchProductsTool],
    voltOpsClient,
  });

  const result = await agent.generateText(
    `Find the best product matches for this request:\n${prompt}`,
    {
      output: Output.object({ schema: agentResponseSchema }),
    },
  );

  const response = agentResponseSchema.parse(result.output);

  return {
    prompt,
    answer:
      products.length > 0
        ? response.answer
        : "Nie znaleziono pasujących produktów w tabeli products dla tego prompta.",
    products,
  };
}
