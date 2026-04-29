import "server-only";

import { Output } from "ai";
import { Agent, createTool } from "@voltagent/core";
import { z } from "zod";

import { lookupProductsBySkus, searchProductsBatch } from "../products/productSearchService";
import { getOpenAIModel } from "./modelConfig";
import { voltOpsClient } from "./voltOpsClient";

const OFFER_AGENT_INSTRUCTIONS = `
You generate a structured offer from a customer request.

Workflow:
1. Extract each distinct product item from the request (exact phrase + quantity).
2. Classify each fragment as "sku" or "description":
   - "sku": the fragment is a product code/identifier (alphanumeric with separators, no semantic meaning, e.g. "IV-071-07612", "WG-6256T", "AB12345"). Looks like a database key.
   - "description": natural-language product reference (a name, category, or descriptive phrase, e.g. "szybkozłączki na 3 kable", "miernik napięcia", "WAGO 5-polowe").
3. Build a query per fragment:
   - For "sku" fragments: query = the SKU itself, exactly as written (no translation).
   - For "description" fragments: query = bilingual (original language + English translation).
4. Call the search_products tool ONCE with all fragments and their kinds in a single batch.
5. Map results to the offer schema.

Rules:
- For EACH request fragment add AT MOST ONE product to "items" — pick the match with the HIGHEST similarity score. For "sku" matches similarity is always 1.0 (exact). For "description" matches require similarity >= 0.7.
- Never add multiple products for the same request fragment.
- If a fragment has zero matches OR all "description" matches are below 0.7 similarity, add its exact requestFragment phrase to "unmatched".
- Use the "id" field (UUID) as productId — never use SKU as productId.
- Each product id may appear in "items" AT MOST ONCE across all fragments. If best match for fragment B is already used by fragment A, add fragment B's requestFragment to "unmatched".
- Write rationale in English.
- requestItem must be the exact phrase from the customer request (the requestFragment).
- ALWAYS populate "debugFragments": one entry per extracted fragment with requestFragment, query, kind, quantity, and topMatches (up to 3 matches from the search_products tool result). Include this even when no products are matched.
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

const fragmentKindSchema = z
  .enum(["sku", "description"])
  .describe(
    "How the fragment was looked up: 'sku' for exact SKU match, 'description' for semantic search"
  );

const debugFragmentSchema = z.object({
  requestFragment: z.string().describe("Exact phrase from the customer request"),
  query: z.string().describe("Search query (bilingual for description, raw SKU for sku)"),
  kind: fragmentKindSchema,
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
    .describe("Top matches from search_products tool")
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
      "Searches the product catalog. Each query has a kind: 'sku' (exact match on SKU column) or 'description' (semantic vector search). Pass all fragments in a single batch call. Returns top matches per query with id (UUID), sku, name, similarity.",
    parameters: z
      .object({
        queries: z
          .array(
            z.object({
              query: z.string().describe("The SKU or bilingual description query"),
              kind: fragmentKindSchema
            })
          )
          .describe("One entry per distinct request fragment")
      })
      .strict(),
    outputSchema: z.object({
      results: z.array(
        z.object({
          query: z.string(),
          kind: fragmentKindSchema,
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
      const skuQueries = queries.filter((q) => q.kind === "sku").map((q) => q.query);
      const descQueries = queries.filter((q) => q.kind === "description").map((q) => q.query);

      const [skuMap, descMap] = await Promise.all([
        lookupProductsBySkus(skuQueries),
        searchProductsBatch(descQueries, { limit: 3, minSimilarity: 0 })
      ]);

      const results = queries.map(({ query, kind }) => {
        if (kind === "sku") {
          const match = skuMap.get(query);
          const matches = match
            ? [{ id: match.id, sku: match.sku, name: match.name, similarity: match.similarity }]
            : [];
          return { query, kind, matches };
        }
        const matches = (descMap.get(query) ?? []).map((m) => ({
          id: m.id,
          sku: m.sku,
          name: m.name,
          similarity: m.similarity
        }));
        return { query, kind, matches };
      });

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
