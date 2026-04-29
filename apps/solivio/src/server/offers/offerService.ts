import "server-only";

import { inArray, eq } from "drizzle-orm";
import type { Offer } from "@solivio/domain";

import { db } from "../database/db";
import { products } from "../database/schema";
import type { GeneratedOffer } from "../agents/offerGenerationAgent";
import type { OfferDebugFragment } from "@solivio/domain";
import {
  deleteOffer as deleteOfferRow,
  findOfferById,
  insertOffer,
  insertOfferProducts,
  insertOfferProduct,
  updateOfferMeta as persistOfferMeta,
  updateOfferProduct,
  deleteOfferProduct,
  getRecentOffers,
  type OfferRow,
  type UpdateOfferMetaInput
} from "./offerRepository";

// ── Types ──────────────────────────────────────────────────────────────────────

export type OfferLineItem = {
  offerProductId: string;
  productId: string;
  productName: string;
  productSku: string;
  productDescription: string;
  productManufacturer: string;
  requestItem: string;
  quantity: number;
  unitPriceNet: number;
  currency: string;
  rationale: string;
};

export type CreatedOffer = {
  id: string;
  name: string;
  customerName: string | null;
  clientRequest: string | null;
  status: Offer["status"];
  generatedAt: string;
  items: OfferLineItem[];
  unmatched: string[];
  notes: string[];
  debugFragments: OfferDebugFragment[];
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

function rowToCreatedOffer(row: OfferRow): CreatedOffer {
  return {
    id: row.id,
    name: row.name,
    customerName: row.customerName,
    clientRequest: row.clientRequest,
    status: row.status,
    generatedAt: row.createdAt.toISOString(),
    items: row.items,
    unmatched: row.unmatched,
    notes: row.notes,
    debugFragments: row.debugFragments
  };
}

export function toOfferDomain(offer: CreatedOffer): Offer {
  return {
    id: offer.id,
    requestId: offer.id,
    name: offer.name,
    customerName: offer.customerName ?? undefined,
    clientRequest: offer.clientRequest ?? undefined,
    status: offer.status as Offer["status"],
    generatedAt: offer.generatedAt,
    notes: offer.notes,
    unmatched: offer.unmatched,
    debugFragments: offer.debugFragments,
    items: offer.items.map((item) => ({
      offerProductId: item.offerProductId,
      productId: item.productId,
      quantity: item.quantity,
      rationale: item.rationale,
      requestItem: item.requestItem,
      unitPriceNet: item.unitPriceNet,
      currency: item.currency as Offer["items"][number]["currency"],
      product: {
        id: item.productId,
        sku: item.productSku,
        name: item.productName,
        description: item.productDescription,
        manufacturer: item.productManufacturer,
        priceNet: item.unitPriceNet,
        currency: item.currency as NonNullable<Offer["items"][number]["product"]>["currency"],
        source: "semantic-search" as const
      }
    }))
  };
}

// ── Service ────────────────────────────────────────────────────────────────────

export async function createOffer(
  customerName: string | undefined,
  clientRequest: string,
  generated: GeneratedOffer
): Promise<CreatedOffer> {
  const { items, extraUnmatched } = deduplicateItems(generated);

  // Pre-validate product IDs outside transaction to build unmatched list.
  const productIds = items.map((i) => i.productId);
  const existingProducts = productIds.length > 0
    ? await db.select({ id: products.id, priceNet: products.priceNet, currency: products.currency })
        .from(products)
        .where(inArray(products.id, productIds))
    : [];
  const priceMap = new Map(existingProducts.map((p) => [p.id, p]));
  const validItems = items.filter((item) => priceMap.has(item.productId));
  const hallucinated = items
    .filter((item) => !priceMap.has(item.productId))
    .map((item) => item.requestItem);

  return db.transaction(async (tx) => {
    const offer = await insertOffer(
      {
        customerName: customerName ?? null,
        clientRequest,
        status: "draft",
        notes: generated.notes,
        unmatched: [...generated.unmatched, ...extraUnmatched, ...hallucinated],
        debugFragments: generated.debugFragments
      },
      tx
    );

    await insertOfferProducts(
      validItems.map((item) => {
        const catalog = priceMap.get(item.productId)!;
        return {
          offerId: offer.id,
          productId: item.productId,
          requestItem: item.requestItem,
          quantity: item.quantity,
          unitPriceNet: catalog.priceNet ?? 0,
          currency: catalog.currency ?? "PLN",
          rationale: item.rationale
        };
      }),
      tx
    );

    const row = await findOfferById(offer.id, tx);
    return rowToCreatedOffer(row!);
  });
}

export async function getOffer(id: string): Promise<Offer | null> {
  const row = await findOfferById(id);
  if (!row) return null;
  return toOfferDomain(rowToCreatedOffer(row));
}

export async function updateOfferStatusAndFetch(
  offerId: string,
  status: Offer["status"]
): Promise<Offer | null> {
  return updateOfferMeta(offerId, { status });
}

export async function updateOfferMeta(
  offerId: string,
  data: UpdateOfferMetaInput
): Promise<Offer | null> {
  const existing = await findOfferById(offerId);
  if (!existing) return null;
  const updated = await persistOfferMeta(offerId, data);
  if (!updated) return null;
  return getOffer(offerId);
}

export async function deleteOffer(offerId: string): Promise<boolean> {
  const existing = await findOfferById(offerId);
  if (!existing) return false;
  await deleteOfferRow(offerId);
  return true;
}

export async function addProductToOffer(
  offerId: string,
  productId: string,
  quantity: number,
  requestItem = ""
): Promise<CreatedOffer | null | "duplicate"> {
  const existing = await findOfferById(offerId);
  if (!existing) return null;
  const duplicate = existing.items.find((i) => i.productId === productId);
  if (duplicate) return "duplicate";
  const product = await db
    .select({ priceNet: products.priceNet, currency: products.currency })
    .from(products)
    .where(eq(products.id, productId))
    .then((rows) => rows[0]);

  if (!product) return null;

  await insertOfferProduct({ 
    offerId, 
    productId, 
    requestItem, 
    quantity, 
    unitPriceNet: product.priceNet ?? 0, 
    currency: product.currency ?? "PLN", 
    rationale: "" 
  });
  const row = await findOfferById(offerId);
  return rowToCreatedOffer(row!);
}

export async function updateOfferLineItem(
  offerProductId: string,
  offerId: string,
  quantity: number
): Promise<CreatedOffer | null> {
  const existing = await findOfferById(offerId);
  if (!existing) return null;
  const item = existing.items.find((i) => i.offerProductId === offerProductId);
  if (!item) return null;
  await updateOfferProduct(offerProductId, offerId, { quantity });
  const row = await findOfferById(offerId);
  return rowToCreatedOffer(row!);
}

export async function removeOfferLineItem(
  offerProductId: string,
  offerId: string
): Promise<boolean> {
  const existing = await findOfferById(offerId);
  if (!existing) return false;
  const item = existing.items.find((i) => i.offerProductId === offerProductId);
  if (!item) return false;
  await deleteOfferProduct(offerProductId, offerId);
  return true;
}

export async function getOffers() {
  return await getRecentOffers(100);
}

export { getRecentOffers };
