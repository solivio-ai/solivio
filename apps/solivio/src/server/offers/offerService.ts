import "server-only";

import { eq } from "drizzle-orm";

import { db } from "../database/db";
import { offerProducts, offers, products } from "../database/schema";
import type { GeneratedOffer } from "../agents/offerGenerationAgent";

// ── Types ──────────────────────────────────────────────────────────────────────

export type OfferLineItem = {
  productId: string;
  productName: string;
  productSku: string;
  productDescription: string;
  productManufacturer: string;
  requestItem: string;
  quantity: number;
  rationale: string;
};

export type CreatedOffer = {
  id: string;
  customerName: string | null;
  clientRequest: string | null;
  status: string;
  generatedAt: string;
  items: OfferLineItem[];
  unmatched: string[];
  notes: string[];
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function deduplicateItems(generated: GeneratedOffer): {
  items: GeneratedOffer["items"];
  extraUnmatched: string[];
} {
  const seen = new Set<string>();
  const extraUnmatched: string[] = [];

  const items = generated.items.filter((item) => {
    if (seen.has(item.productId)) {
      extraUnmatched.push(item.requestItem);
      return false;
    }
    seen.add(item.productId);
    return true;
  });

  return { items, extraUnmatched };
}

// ── Service ────────────────────────────────────────────────────────────────────

export async function createOffer(
  customerName: string | undefined,
  clientRequest: string,
  generated: GeneratedOffer
): Promise<CreatedOffer> {
  const { items, extraUnmatched } = deduplicateItems(generated);

  return db.transaction(async (tx) => {
    const [offer] = await tx
      .insert(offers)
      .values({
        customerName: customerName ?? null,
        clientRequest,
        status: "draft",
        notes: generated.notes,
        unmatched: [...generated.unmatched, ...extraUnmatched]
      })
      .returning();

    if (items.length > 0) {
      await tx.insert(offerProducts).values(
        items.map((item) => ({
          offerId: offer.id,
          productId: item.productId,
          requestItem: item.requestItem,
          quantity: item.quantity,
          rationale: item.rationale
        }))
      );
    }

    const lineItems = await tx
      .select({
        productId: offerProducts.productId,
        productName: products.name,
        productSku: products.sku,
        productDescription: products.description,
        productManufacturer: products.manufacturer,
        requestItem: offerProducts.requestItem,
        quantity: offerProducts.quantity,
        rationale: offerProducts.rationale
      })
      .from(offerProducts)
      .innerJoin(products, eq(products.id, offerProducts.productId))
      .where(eq(offerProducts.offerId, offer.id));

    return {
      id: offer.id,
      customerName: offer.customerName,
      clientRequest: offer.clientRequest,
      status: offer.status,
      generatedAt: offer.createdAt.toISOString(),
      items: lineItems.map((row) => ({
        productId: row.productId,
        productName: row.productName,
        productSku: row.productSku,
        productDescription: row.productDescription,
        productManufacturer: row.productManufacturer,
        requestItem: row.requestItem,
        quantity: row.quantity,
        rationale: row.rationale
      })),
      unmatched: offer.unmatched,
      notes: offer.notes
    };
  });
}
