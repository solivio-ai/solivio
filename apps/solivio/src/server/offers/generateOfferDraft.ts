import "server-only";

import { demoOffer, demoProducts, type Offer, type Product } from "@solivio/domain";
import { desc, ilike, or } from "drizzle-orm";

import { searchProductsByPrompt, type ProductSearchMatch } from "../products/productSearchService";

type GenerateOfferDraftInput = {
  customerName?: string;
  clientRequest?: string;
};

type DatabaseProduct = {
  id: string;
  sku: string;
  name: string;
  description: string;
  manufacturer: string;
};

const DEFAULT_LIMIT = 5;

export async function generateOfferDraft(input: GenerateOfferDraftInput): Promise<Offer> {
  const now = Date.now();
  const clientRequest = input.clientRequest?.trim() || demoOffer.clientRequest || "";
  const semanticMatches = await findSemanticMatches(clientRequest);
  const databaseProducts = semanticMatches.length > 0 ? [] : await findDatabaseProducts(clientRequest);

  const items =
    semanticMatches.length > 0
      ? semanticMatches.map(matchToOfferItem)
      : databaseProducts.length > 0
        ? databaseProducts.map(databaseProductToOfferItem)
        : buildDemoItems(clientRequest);

  return {
    id: `offer-${now}`,
    requestId: `request-${now}`,
    customerName: input.customerName?.trim() || "Demo customer",
    clientRequest,
    status: "draft",
    generatedAt: new Date().toISOString(),
    items,
    notes: [
      ...buildRequestNotes(input.customerName, clientRequest),
      ...(semanticMatches.length > 0
        ? ["Products were selected from the imported catalog using semantic search."]
        : databaseProducts.length > 0
          ? ["Using imported catalog products. Add embeddings/OpenAI configuration for ranked semantic matching."]
          : ["Using demo catalog products because no imported catalog match was available."]),
      ...(items.some((item) => item.unitPriceNet === undefined)
        ? ["Some imported products do not have prices yet. Set unit prices during sales review."]
        : [])
    ]
  };
}

async function findSemanticMatches(prompt: string): Promise<ProductSearchMatch[]> {
  if (!process.env.OPENAI_API_KEY || prompt.trim().length === 0) return [];

  try {
    return await searchProductsByPrompt(prompt, { limit: DEFAULT_LIMIT, minSimilarity: 0 });
  } catch {
    return [];
  }
}

async function findDatabaseProducts(prompt: string): Promise<DatabaseProduct[]> {
  const lexicalMatches = await findLexicalDatabaseProducts(prompt);
  return lexicalMatches.length > 0 ? lexicalMatches : findRecentDatabaseProducts();
}

async function findLexicalDatabaseProducts(prompt: string): Promise<DatabaseProduct[]> {
  const terms = tokenize(prompt);
  if (terms.length === 0 || !canUseDatabase()) return [];

  try {
    const [{ db }, { products }] = await Promise.all([
      import("../database/db"),
      import("../database/schema")
    ]);
    const condition = or(
      ...terms.flatMap((term) => [
        ilike(products.sku, `%${term}%`),
        ilike(products.name, `%${term}%`),
        ilike(products.description, `%${term}%`),
        ilike(products.manufacturer, `%${term}%`)
      ])
    );

    if (!condition) return [];

    return await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        description: products.description,
        manufacturer: products.manufacturer
      })
      .from(products)
      .where(condition)
      .orderBy(desc(products.createdAt))
      .limit(DEFAULT_LIMIT);
  } catch {
    return [];
  }
}

async function findRecentDatabaseProducts(): Promise<DatabaseProduct[]> {
  if (!canUseDatabase()) return [];

  try {
    const [{ db }, { products }] = await Promise.all([
      import("../database/db"),
      import("../database/schema")
    ]);

    return await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        description: products.description,
        manufacturer: products.manufacturer
      })
      .from(products)
      .orderBy(desc(products.createdAt))
      .limit(DEFAULT_LIMIT);
  } catch {
    return [];
  }
}

function canUseDatabase() {
  return Boolean(process.env.DATABASE_URL) || process.env.NODE_ENV === "development";
}

function tokenize(prompt: string) {
  return Array.from(
    new Set(
      prompt
        .toLowerCase()
        .split(/[^a-z0-9ąćęłńóśźż]+/i)
        .map((term) => term.trim())
        .filter((term) => term.length >= 3)
        .slice(0, 8)
    )
  );
}

function matchToOfferItem(match: ProductSearchMatch): Offer["items"][number] {
  const confidence = Math.max(1, Math.min(100, Math.round(match.similarity * 100)));

  return {
    productId: match.id,
    quantity: 1,
    rationale: `Matched from the imported catalog. ${match.manufacturer} product with ${confidence}% semantic fit for the request.`,
    confidence,
    product: {
      id: match.id,
      sku: match.sku,
      name: match.name,
      description: match.description,
      manufacturer: match.manufacturer,
      matchScore: match.similarity,
      source: "semantic-search"
    }
  };
}

function databaseProductToOfferItem(product: DatabaseProduct): Offer["items"][number] {
  return {
    productId: product.id,
    quantity: 1,
    rationale: `Selected from the imported catalog. Confirm fit because semantic ranking is not available for this draft.`,
    confidence: 70,
    product: {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      manufacturer: product.manufacturer,
      source: "database"
    }
  };
}

function buildDemoItems(requestText: string): Offer["items"] {
  const normalized = requestText.toLowerCase();
  const scored = demoProducts
    .map((product) => ({
      product,
      score: scoreDemoProduct(product, normalized)
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ product }) => product);

  const productsToUse = scored.length > 0 ? scored : demoProducts;

  return productsToUse.map((product) => ({
    productId: product.id,
    quantity: product.id === "solar-panel-430" ? 24 : 1,
    rationale: `Matched against the demo catalog using request keywords: ${product.tags.slice(0, 3).join(", ")}.`,
    confidence: product.id === "hybrid-inverter-8kw" ? 82 : 90,
    unitPriceNet: product.priceNet,
    currency: product.currency,
    product: {
      id: product.id,
      name: product.name,
      availability: product.availability,
      priceNet: product.priceNet,
      currency: product.currency,
      source: "demo"
    }
  }));
}

function scoreDemoProduct(product: Product, normalizedRequest: string) {
  return product.tags.reduce(
    (score, tag) => score + (normalizedRequest.includes(tag.toLowerCase()) ? 1 : 0),
    0
  );
}

function buildRequestNotes(customerName: string | undefined, clientRequest: string) {
  const notes = [
    `Draft generated for ${customerName?.trim() || "Demo customer"} from the submitted request.`
  ];

  if (clientRequest.trim().length === 0) {
    notes.push("No request text was submitted, so the draft uses the default demo request.");
  }

  return notes;
}
