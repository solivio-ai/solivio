import "server-only";

import { Output } from "ai";
import { Agent, createTool } from "@voltagent/core";
import { z } from "zod";

import { searchProductsByPrompt } from "../products/productSearchService";
import { getOpenAIModel } from "./modelConfig";

// ── Output schema ──────────────────────────────────────────────────────────────

const offerItemSchema = z.object({
  productId: z.string().describe("UUID from the 'id' field of the search result"),
  productName: z.string().describe("Name of the matched product"),
  productSku: z.string().describe("SKU of the matched product"),
  requestItem: z.string().describe("The requestFragment value passed to search_products"),
  quantity: z.number().int().positive().describe("Quantity the customer requested"),
  rationale: z.string().describe("Why this product matches the request")
});

const agentOutputSchema = z.object({
  items: z.array(offerItemSchema),
  unmatched: z.array(z.string()).describe(
    "requestFragment values where catalogHasMatch was false"
  ),
  notes: z.array(z.string()).describe("Additional notes or substitutions")
});

export type GeneratedOffer = z.infer<typeof agentOutputSchema>;

// ── Tool ───────────────────────────────────────────────────────────────────────

const searchProductsTool = createTool({
  name: "search_products",
  description:
    "Search the product catalog for one specific item from the customer request. " +
    "Call once per request fragment. " +
    "Returns catalogHasMatch=false when no product in the catalog is similar enough.",
  parameters: z.object({
    requestFragment: z
      .string()
      .describe("The exact fragment from the customer request being looked up, e.g. '4 sery'"),
    query: z
      .string()
      .describe("Search query in English derived from requestFragment"),
    limit: z.number().int().positive().max(5).default(3)
  }),
  execute: async ({ requestFragment, query, limit }) => {
    const results = await searchProductsByPrompt(query, { limit });
    return {
      requestFragment,
      catalogHasMatch: results.length > 0,
      results
    };
  }
});

// ── Agent ──────────────────────────────────────────────────────────────────────

function buildInstructions(customerName?: string) {
  return `
You are a B2B sales assistant matching customer request items to catalog products.
The request may be in Polish or English — handle both.
${customerName ? `Customer: ${customerName}.` : ""}

For each distinct item in the request:
1. Call search_products with requestFragment = the exact phrase from the request, and query = English translation.
2. Check the catalogHasMatch field in the response.
   - If catalogHasMatch is FALSE: add requestFragment to unmatched. Stop. Do not use any result.
   - If catalogHasMatch is TRUE: pick the result with the highest similarity score.
3. Each catalog product (by id) may appear in items AT MOST ONCE.
   If the best match is already taken by another item, add this requestFragment to unmatched instead.

Output rules:
- items: only products where catalogHasMatch was true and the product was not already used
- unmatched: requestFragment values where catalogHasMatch was false or the match was already taken
- notes: any relevant observations
- Write rationale and notes in English.
  `.trim();
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function generateOfferWithAgent(
  clientRequest: string,
  customerName?: string
): Promise<GeneratedOffer> {
  const agent = new Agent({
    name: "offer-generation-agent",
    instructions: buildInstructions(customerName),
    model: getOpenAIModel(),
    tools: [searchProductsTool]
  });

  const result = await agent.generateText(
    `Generate a product offer for the following customer request:\n\n${clientRequest}`,
    { output: Output.object({ schema: agentOutputSchema }) }
  );

  return agentOutputSchema.parse(result.output);
}
