import "server-only";

import { Output } from "ai";
import { Agent, createTool } from "@voltagent/core";
import { z } from "zod";

import { lookupProductsBySkus, searchProductsBatch } from "../products/productSearchService";
import { getOpenAIModel } from "./modelConfig";
import { voltOpsClient } from "./voltOpsClient";

const LOCALE_LANGUAGE_MAP: Record<string, string> = {
  pl: "Polish",
  en: "English",
  de: "German",
  fr: "French",
};

function getRationaleLanguage(): string {
  const locale = (process.env.APP_LOCALE ?? "pl").toLowerCase().split("-")[0];
  return LOCALE_LANGUAGE_MAP[locale] ?? "Polish";
}

const OFFER_AGENT_INSTRUCTIONS = `
You generate a structured offer from a customer request.

Workflow:
1. Extract each distinct product item from the request (exact phrase + quantity).
2. Classify each fragment as "sku" or "description":
   - "sku": the fragment is a product code/identifier (alphanumeric with separators, no semantic meaning, e.g. "IV-071-07612", "WG-6256T", "AB12345"). Looks like a database key.
   - "description": natural-language product reference (a name, category, or descriptive phrase, e.g. "szybkozłączki na 3 kable", "miernik napięcia", "WAGO 5-polowe").
3. Build a query per fragment:
   - For "sku" fragments: query = the SKU itself, exactly as written (no translation).
   - For "description" fragments: query = bilingual product name only (original language + English translation).
     CRITICAL: DO NOT include quantity numbers, units, or count words in the query. Quantity goes to the separate "quantity" field, never to the query.
       Wrong: "5 listw zaciskowych / 5 terminal strips"
       Right: "listwa zaciskowa / terminal strip"
       Wrong: "100 sztuk czujników ruchu"
       Right: "czujnik ruchu / motion sensor"
     Use the base nominative singular form of nouns (Polish: mianownik liczba pojedyncza) when possible. Embedding models handle base forms better than declensions.
       Wrong: "listw zaciskowych" (genitive plural)
       Right: "listwa zaciskowa" (nominative singular)
     Keep technical specs (voltage, wattage, pole count, dimensions) — they ARE part of the product identity.
       Right: "zasilacz LED 48V / LED power supply 48V"
       Right: "złączka 3-bieg / 3-pole connector"
4. Call the search_products tool ONCE with all fragments and their kinds in a single batch.
5. Map results to the offer schema.

Rules:
- For "sku" fragments: if exact match exists (similarity = 1.0) — use it. Otherwise unmatched.
- For "description" fragments: search_products returns up to 10 candidates ranked by vector similarity (which is unreliable for Polish technical terms — DO NOT trust the similarity number alone). YOU rerank by reading the product names:
    * Pick the candidate whose NAME is the closest semantic match to the requestFragment (same product type, same category, manufacturer if mentioned).
    * Polish "listwa zaciskowa" should match "Listwa zaciskowa ..." even if it's at position 5 with similarity 0.54.
    * Polish "czujnik wycieku" should match "Czujnik zalania ..." (same concept) even with low similarity.
    * If NONE of the 10 candidates is plausibly the requested product (different category entirely), put requestFragment in "unmatched".
- Never add multiple products for the same request fragment. Pick exactly ONE.
- Use the "id" field (UUID) as productId — never use SKU as productId.
- Each product id may appear in "items" AT MOST ONCE across all fragments. If best match for fragment B is already used by fragment A, add fragment B's requestFragment to "unmatched".
- Write rationale in ${getRationaleLanguage()}. Briefly explain WHY this product matched (e.g., "exact category match: terminal block" or "same SKU").
- requestItem must be the exact phrase from the customer request (the requestFragment).
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

const agentOutputSchema = z.object({
  items: z.array(offerItemSchema),
  unmatched: z.array(z.string()).describe("requestFragment values with no catalog match"),
  notes: z.array(z.string()).describe("Additional notes or substitutions")
});

export type GeneratedOffer = z.infer<typeof agentOutputSchema>;

// ── Public API ─────────────────────────────────────────────────────────────────

export async function generateOfferWithAgent(
  clientRequest: string,
  customerName?: string
): Promise<GeneratedOffer> {
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
        // Top-10 candidates per query (recall stage). LLM reranks in next agent pass (precision).
        searchProductsBatch(descQueries, { limit: 10, minSimilarity: 0 })
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

  return agentOutputSchema.parse(result.output);
}
