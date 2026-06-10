import "server-only";

import { Agent, createTool, VoltOpsClient } from "@voltagent/core";
import { Output } from "ai";
import { z } from "zod";

import { searchProductsByPrompt } from "./productSearchService.ts";

// Moved verbatim from the app's `server/agents/productSearchAgent.ts` together
// with its only consumer (`POST /api/products/search`). It keeps the same
// deployment knobs: OPENAI_MODEL_PRODUCT_SEARCH overrides the model, and
// VoltOps tracing is enabled by the same VOLTAGENT_* env vars as the core
// agents. Slated to become a `search_catalog` agent tool (docs/agents.md).

const DEFAULT_PRODUCT_SEARCH_MODEL = "openai/gpt-5.4-nano";

function getProductSearchModel(): string {
  return process.env.OPENAI_MODEL_PRODUCT_SEARCH?.trim() || DEFAULT_PRODUCT_SEARCH_MODEL;
}

// Set VOLTAGENT_TRACING=true to enable VoltOps tracing. Off by default.
const voltOpsClient =
  process.env.VOLTAGENT_TRACING === "true" &&
  process.env.VOLTAGENT_PUBLIC_KEY &&
  process.env.VOLTAGENT_SECRET_KEY
    ? new VoltOpsClient({
        publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
        secretKey: process.env.VOLTAGENT_SECRET_KEY,
      })
    : undefined;

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
    model: getProductSearchModel(),
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
