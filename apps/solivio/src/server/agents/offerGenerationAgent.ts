import "server-only";

import { Output } from "ai";
import { Agent, createTool } from "@voltagent/core";
import { z } from "zod";

import { searchProductsBatch } from "../products/productSearchService";
import { getOpenAIModel } from "./modelConfig";
import { voltOpsClient } from "./voltOpsClient";

const OFFER_AGENT_INSTRUCTIONS = `
You generate a structured offer from a customer request.

Workflow:
1. Extract each distinct product item from the request (exact phrase + quantity).
2. Build a bilingual search query per item (original language + English translation).
3. Call the search_products tool ONCE with all queries in a single batch.
4. Map results to the offer schema.

Rules:
- For EACH request fragment add AT MOST ONE product to "items" — pick the match with the HIGHEST similarity score, but ONLY if similarity >= 0.7.
- Never add multiple products for the same request fragment.
- If a fragment has zero matches OR all matches are below 0.7 similarity, add its exact requestFragment phrase to "unmatched".
- Use the "id" field (UUID) as productId — never use SKU as productId.
- Each product id may appear in "items" AT MOST ONCE across all fragments. If best match for fragment B is already used by fragment A, add fragment B's requestFragment to "unmatched".
- Write rationale in English.
- requestItem must be the exact phrase from the customer request (the requestFragment).
- ALWAYS populate "debugFragments": one entry per extracted fragment with requestFragment, query, quantity, and topMatches (up to 3 matches from the search_products tool result, sorted by similarity desc). Include this even when no products are matched.
`.trim();

// ── Schemas ────────────────────────────────────────────────────────────────────

const offerItemSchema = z.object({
  productId: z.string().describe("UUID from the 'id' field of the search result"),
  productName: z.string().describe("Name of the matched product"),
  productSku: z.string().describe("SKU of the matched product"),
  requestItem: z.string().describe("Exact phrase from the customer request for this item"),
  quantity: z.number().int().positive().describe("Quantity the customer requested"),
  rationale: z.string().describe("Why this product matches the request")
});

const debugFragmentSchema = z.object({
  requestFragment: z.string().describe("Exact phrase from the customer request"),
  query: z.string().describe("Bilingual search query used"),
  quantity: z.number().int().positive(),
  topMatches: z
    .array(
      z.object({
        id: z.string(),
        sku: z.string(),
        name: z.string(),
        similarity: z.number()
      })
    )
    .max(3)
    .describe("Top 3 matches by similarity from search_products tool")
});

const agentOutputSchema = z.object({
  items: z.array(offerItemSchema),
  unmatched: z.array(z.string()).describe("requestFragment values with no catalog match"),
  notes: z.array(z.string()).describe("Additional notes or substitutions"),
  debugFragments: z
    .array(debugFragmentSchema)
    .describe("Debug info: every extracted fragment with its top 3 search matches")
});

export type GeneratedOffer = z.infer<typeof agentOutputSchema>;

// ── Public API ─────────────────────────────────────────────────────────────────

export async function generateOfferWithAgent(
  clientRequest: string,
  customerName?: string
): Promise<GeneratedOffer> {
  // Deterministic capture of tool output — LLMs hallucinate numbers, so we
  // override agent-reported topMatches with actual search results keyed by query.
  const capturedMatches = new Map<
    string,
    { id: string; sku: string; name: string; similarity: number }[]
  >();

  const searchProductsTool = createTool({
    name: "search_products",
    description:
      "Searches the product catalog for each fragment of the customer request. Pass a bilingual query (original language + English translation) per item. Returns top matches per query with id (UUID), sku, name, similarity.",
    parameters: z
      .object({
        queries: z
          .array(z.string())
          .describe("Bilingual search queries, one per distinct request fragment")
      })
      .strict(),
    outputSchema: z.object({
      results: z.array(
        z.object({
          query: z.string(),
          matches: z.array(
            z.object({
              id: z.string(),
              sku: z.string(),
              name: z.string(),
              similarity: z.number()
            })
          )
        })
      )
    }),
    execute: async ({ queries }) => {
      // minSimilarity: 0 — debug panel needs raw top 3 regardless of threshold.
      // Agent applies its own threshold in instructions when deciding 'items'.
      const map = await searchProductsBatch(queries, { limit: 3, minSimilarity: 0 });
      const results = queries.map((query) => ({
        query,
        matches: (map.get(query) ?? []).map((m) => ({
          id: m.id,
          sku: m.sku,
          name: m.name,
          similarity: m.similarity
        }))
      }));
      for (const { query, matches } of results) {
        capturedMatches.set(query, matches);
      }
      return { results };
    }
  });

  const agent = new Agent({
    name: "offer-generation-agent",
    instructions: OFFER_AGENT_INSTRUCTIONS,
    model: getOpenAIModel(),
    tools: [searchProductsTool],
    voltOpsClient
  });

  const userMessage = [
    customerName ? `Customer: ${customerName}.` : "",
    `Request: ${clientRequest}`
  ]
    .filter(Boolean)
    .join("\n");

  const result = await agent.generateText(userMessage, {
    output: Output.object({ schema: agentOutputSchema })
  });

  const parsed = agentOutputSchema.parse(result.output);

  // Override agent-reported topMatches with deterministic tool-captured matches
  // keyed by query. LLM otherwise hallucinates similarity scores.
  const debugFragments = parsed.debugFragments.map((f) => ({
    ...f,
    topMatches: capturedMatches.get(f.query) ?? []
  }));

  return { ...parsed, debugFragments };
}
