import "server-only";

import { Agent, createTool } from "@voltagent/core";
import { Output } from "ai";
import { z } from "zod";

import { lookupProductsBySkus, searchProductsBatch } from "../products/productSearchService";
import { getModelFor } from "./modelConfig";
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
You generate a structured offer from a customer request. The catalog can span any industry
(electrical, plumbing, HVAC, IT/networking, fasteners and tools, office supplies, lab and
medical, automotive parts, etc.). The same rules apply regardless of domain.

Workflow:
1. Extract each distinct product item from the request (exact phrase + quantity).
2. Classify each fragment as "sku" or "description":
   - "sku": the fragment is a product code/identifier (alphanumeric with separators, no semantic meaning, e.g. "IV-071-07612", "WG-6256T", "AB12345"). Looks like a database key.
   - "description": a natural-language product reference — a name, category, or descriptive phrase from any industry, e.g.:
       * medical: "strzykawka jednorazowa 5ml", "rękawiczki nitrylowe rozmiar M", "stetoskop kardiologiczny"
       * plumbing: "kolanko miedziane 1/2 cala", "1/2 inch copper elbow"
       * IT: "switch 24-portowy gigabit", "Cat6 patch cable 2m"
       * fasteners: "śruba M10 nierdzewna", "M10 stainless steel bolt"
       * office: "papier A4 80g", "ergonomiczne krzesło biurowe"
       * electrical: "WAGO 5-polowe", "miernik napięcia"
3. Build a query per fragment:
   - For "sku" fragments: query = the SKU itself, exactly as written (no translation).
   - For "description" fragments: query = bilingual product name only (original language + English translation).
     CRITICAL: DO NOT include quantity numbers, units, or count words in the query. Quantity goes to the separate "quantity" field, never to the query.
       Wrong: "50 śrub M10 nierdzewnych / 50 stainless M10 bolts"
       Right: "śruba M10 nierdzewna / M10 stainless steel bolt"
       Wrong: "200 sztuk strzykawek jednorazowych 5ml / 200 pcs 5ml disposable syringes"
       Right: "strzykawka jednorazowa 5ml / 5ml disposable syringe"
     Use the base/dictionary form (lemma) of nouns and adjectives — singular, nominative, masculine where applicable. Embedding models handle lemmas more reliably than inflected forms. This matters most for morphologically rich languages (Polish, German, Russian, Czech, etc.).
       Wrong: "strzykawek jednorazowych" (Polish, genitive plural)
       Right: "strzykawka jednorazowa" (Polish, nominative singular)
     Keep model-defining attributes — they ARE part of the product identity. These typically include size/dimensions, capacity, material, voltage, rating, version, model number, port count, color. Drop only generic adjectives ("good", "cheap", "small") that don't identify a specific product.
       Right: "strzykawka jednorazowa 5ml / 5ml disposable syringe"
       Right: "rękawiczki nitrylowe rozmiar M / size M nitrile gloves"
       Right: "śruba M10 nierdzewna / M10 stainless steel bolt"
       Right: "switch 24-portowy gigabit / 24-port gigabit switch"
       Right: "zasilacz LED 48V / LED power supply 48V"
4. Call the search_products tool ONCE with all fragments and their kinds in a single batch.
5. Map results to the offer schema.

Rules:
- For "sku" fragments: if exact match exists (similarity = 1.0) — use it. Otherwise unmatched.
- For "description" fragments: search_products returns up to 10 candidates ranked by vector similarity (which is unreliable for technical terms in inflected languages — DO NOT trust the similarity number alone). YOU rerank by reading BOTH the product name AND the product description:
    * Pick the candidate whose name+description together form the closest semantic match to the requestFragment (same product type, same category, matching specs, manufacturer if mentioned).
    * The catalog name may be terse or generic — the description often contains the discriminating details (variants, sizes, "for upper and lower", "set of N", supported standards, etc.). ALWAYS read the description before deciding.
    * Example: requestFragment "łyżki plastikowe góra dół" — name "Łyżki wyciskowe plastikowe" lacks "góra/dół", but description "do wykonywania wycisku górnego oraz dolnego" confirms the match. ACCEPT it.
    * A request for "listwa zaciskowa" should match "Listwa zaciskowa ..." even if it's at position 5 with similarity 0.54.
    * Catalogs often use synonyms for the same concept ("leak detector" / "flood sensor", "torch" / "flashlight", "czujnik wycieku" / "czujnik zalania"). Match on concept, not lexeme.
    * If NONE of the 10 candidates is plausibly the requested product (different category entirely, even after reading descriptions), put requestFragment in "unmatched".
- Never add multiple products for the same request fragment. Pick exactly ONE.
- Use the "id" field (UUID) as productId — never use SKU as productId.
- Each product id appears in "items" AT MOST ONCE. When multiple fragments map to the same product id, decide:
    * MERGE — if the fragments express the SAME product intent (same product type AND the same identifying specs such as size, capacity, voltage, port count, model number, color, material), combine them into ONE item with quantity = SUM of all fragment quantities. This handles requests where the customer lists the same item under different sections, headings, or rooms (e.g., "Room 1: gauze x10, Room 2: gauze x10" → ONE item with quantity 20). Note the merge in rationale (e.g., "summed across 3 mentions in the request").
    * SPLIT — if the fragments differ in identifying specs (e.g., "size XS" vs "size S", "5ml" vs "10ml", "24-port" vs "48-port", "M10" vs "M12") but only one catalog product matches both, keep ONE item for the first fragment and add the others to "unmatched". The salesperson must see that the catalog lacks the requested variant; do NOT silently sum quantities across distinct variants.
- requestItem: for a single fragment, use the exact phrase from the request. For a merged item, use a canonical phrase that represents all merged fragments (the most specific common form).
- Write rationale in ${getRationaleLanguage()}. Briefly explain WHY this product matched (e.g., "exact category match", "same SKU", "same product type with matching specs"); for merged items, also note the merge.
`.trim();

// ── Schemas ────────────────────────────────────────────────────────────────────

const offerItemSchema = z.object({
  productId: z.string().describe("UUID from the 'id' field of the search result"),
  productName: z.string().describe("Name of the matched product"),
  productSku: z.string().describe("SKU of the matched product"),
  requestItem: z.string().describe("Exact phrase from the customer request for this item"),
  quantity: z.number().int().positive().describe("Quantity the customer requested"),
  rationale: z.string().describe("Why this product matches the request"),
});

const fragmentKindSchema = z
  .enum(["sku", "description"])
  .describe(
    "How the fragment was looked up: 'sku' for exact SKU match, 'description' for semantic search",
  );

const agentOutputSchema = z.object({
  items: z.array(offerItemSchema),
  unmatched: z.array(z.string()).describe("requestFragment values with no catalog match"),
  notes: z.array(z.string()).describe("Additional notes or substitutions"),
});

export type GeneratedOffer = z.infer<typeof agentOutputSchema>;

// ── Public API ─────────────────────────────────────────────────────────────────

export async function generateOfferWithAgent(
  clientRequest: string,
  customerName?: string,
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
              kind: fragmentKindSchema,
            }),
          )
          .describe("One entry per distinct request fragment"),
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
              description: z.string(),
              similarity: z.number(),
            }),
          ),
        }),
      ),
    }),
    execute: async ({ queries }) => {
      const skuQueries = queries.filter((q) => q.kind === "sku").map((q) => q.query);
      const descQueries = queries.filter((q) => q.kind === "description").map((q) => q.query);

      const [skuMap, descMap] = await Promise.all([
        lookupProductsBySkus(skuQueries),
        // Top-10 candidates per query (recall stage). LLM reranks in next agent pass (precision).
        searchProductsBatch(descQueries, { limit: 10, minSimilarity: 0 }),
      ]);

      // Truncate description shown to LLM to keep prompt small while still giving rerank signal.
      const truncate = (s: string) => (s.length > 240 ? `${s.slice(0, 240)}…` : s);

      const results = queries.map(({ query, kind }) => {
        if (kind === "sku") {
          const match = skuMap.get(query);
          const matches = match
            ? [
                {
                  id: match.id,
                  sku: match.sku,
                  name: match.name,
                  description: truncate(match.description),
                  similarity: match.similarity,
                },
              ]
            : [];
          return { query, kind, matches };
        }
        const matches = (descMap.get(query) ?? []).map((m) => ({
          id: m.id,
          sku: m.sku,
          name: m.name,
          description: truncate(m.description),
          similarity: m.similarity,
        }));
        return { query, kind, matches };
      });

      return { results };
    },
  });

  const agent = new Agent({
    name: "offer-generation-agent",
    instructions: OFFER_AGENT_INSTRUCTIONS,
    model: getModelFor("offerGeneration"),
    tools: [searchProductsTool],
    voltOpsClient,
  });

  const userMessage = [
    customerName ? `Customer: ${customerName}.` : "",
    `Request: ${clientRequest}`,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await agent.generateText(userMessage, {
    output: Output.object({ schema: agentOutputSchema }),
  });

  return agentOutputSchema.parse(result.output);
}
