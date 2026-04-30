import "server-only";

import { inArray, eq, and } from "drizzle-orm";
import type { Offer } from "@solivio/domain";

import { db } from "../database/db";
import { products, offerProducts } from "../database/schema";
import type { GeneratedOffer } from "../agents/offerGenerationAgent";
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
  setOfferUpdatedBy,
  type OfferRow,
  type UpdateOfferMetaInput
} from "./offerRepository";
import { saveRevision } from "./offerRevisionService";

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
  updatedAt: string;
  items: OfferLineItem[];
  unmatched: string[];
  notes: string[];
  createdBy: string | null;
  createdByName: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
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
    updatedAt: row.updatedAt.toISOString(),
    items: row.items,
    unmatched: row.unmatched,
    notes: row.notes,
    createdBy: row.createdBy,
    createdByName: row.createdByName,
    updatedBy: row.updatedBy,
    updatedByName: row.updatedByName,
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
    updatedAt: offer.updatedAt,
    notes: offer.notes,
    unmatched: offer.unmatched,
    createdBy: offer.createdBy ? { id: offer.createdBy, name: offer.createdByName ?? "" } : null,
    updatedBy: offer.updatedBy ? { id: offer.updatedBy, name: offer.updatedByName ?? "" } : null,
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
  generated: GeneratedOffer,
  userId?: string | null,
  name?: string
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
        name: name ?? "Draft",
        customerName: customerName ?? null,
        clientRequest,
        status: "draft",
        notes: generated.notes,
        unmatched: [...generated.unmatched, ...extraUnmatched, ...hallucinated],
        createdBy: userId ?? null,
        updatedBy: userId ?? null,
      },
      tx
    );

    await insertOfferProducts(
      validItems.map((item, index) => {
        const catalog = priceMap.get(item.productId)!;
        return {
          offerId: offer.id,
          productId: item.productId,
          requestItem: item.requestItem,
          quantity: item.quantity,
          unitPriceNet: catalog.priceNet ?? 0,
          currency: catalog.currency ?? "PLN",
          rationale: item.rationale,
          position: index
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
  status: Offer["status"],
  userId?: string | null
): Promise<Offer | null> {
  return updateOfferMeta(offerId, { status }, userId);
}

export async function updateOfferMeta(
  offerId: string,
  data: UpdateOfferMetaInput,
  userId?: string | null
): Promise<Offer | null> {
  return db.transaction(async (tx) => {
    const existing = await findOfferById(offerId, tx);
    if (!existing) return null;

    // If the offer is accepted, only allow changing status back to draft (reopening)
    if (existing.status === "accepted" && data.status !== "draft") {
      return null;
    }

    const updated = await persistOfferMeta(offerId, data, tx);
    if (!updated) return null;

    // If the offer was just accepted, sync prices from catalog and lock them by saving a final revision
    const hasContentChanges = Object.keys(data).some((key) => key !== "status");
    if (data.status === "accepted") {
      // Sync current catalog prices to offer_products before locking
      await tx
        .update(offerProducts)
        .set({
          unitPriceNet: products.priceNet,
          currency: products.currency
        })
        .from(products)
        .where(and(eq(offerProducts.offerId, offerId), eq(offerProducts.productId, products.id)));

      await saveRevision(offerId, userId ?? null, new Date(), tx);
    } else if (hasContentChanges) {
      await saveRevision(offerId, userId ?? null, undefined, tx);
    }

    const row = await findOfferById(offerId, tx);
    return row ? toOfferDomain(rowToCreatedOffer(row)) : null;
  });
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
  requestItem = "",
  userId?: string | null
): Promise<CreatedOffer | null | "duplicate" | "locked"> {
  const existing = await findOfferById(offerId);
  if (!existing) return null;
 
  // Prevent adding products to an accepted offer
  if (existing.status === "accepted") {
    return "locked";
  }
 
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
    rationale: "",
    position: existing.items.length
  });
  await setOfferUpdatedBy(offerId, userId ?? null);
  await saveRevision(offerId, userId ?? null);
  const row = await findOfferById(offerId);
  return rowToCreatedOffer(row!);
}

export async function updateOfferLineItem(
  offerProductId: string,
  offerId: string,
  quantity: number,
  userId?: string | null
): Promise<CreatedOffer | null | "locked"> {
  const existing = await findOfferById(offerId);
  if (!existing) return null;
 
  // Prevent editing line items in an accepted offer
  if (existing.status === "accepted") {
    return "locked";
  }
 
  const item = existing.items.find((i) => i.offerProductId === offerProductId);
  if (!item) return null;
  await updateOfferProduct(offerProductId, offerId, { quantity });
  await setOfferUpdatedBy(offerId, userId ?? null);
  await saveRevision(offerId, userId ?? null);
  const row = await findOfferById(offerId);
  return rowToCreatedOffer(row!);
}

export async function removeOfferLineItem(
  offerProductId: string,
  offerId: string,
  userId?: string | null
): Promise<boolean | "locked"> {
  const existing = await findOfferById(offerId);
  if (!existing) return false;
 
  // Prevent removing products from an accepted offer
  if (existing.status === "accepted") {
    return "locked";
  }
 
  const item = existing.items.find((i) => i.offerProductId === offerProductId);
  if (!item) return false;
  await deleteOfferProduct(offerProductId, offerId);
  await setOfferUpdatedBy(offerId, userId ?? null);
  await saveRevision(offerId, userId ?? null);
  return true;
}

export async function getOffers() {
  return await getRecentOffers(100);
}

export { getRecentOffers };
