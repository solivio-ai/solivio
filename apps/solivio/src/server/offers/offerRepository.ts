import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "../database/db";
import type { OfferDebugFragment } from "@solivio/domain";

import { offerProducts, offers, products } from "../database/schema";

// ── Types ──────────────────────────────────────────────────────────────────────

export type InsertOfferData = {
  customerName: string | null;
  clientRequest: string;
  status: string;
  notes: string[];
  unmatched: string[];
  debugFragments: OfferDebugFragment[];
};

export type InsertOfferProductData = {
  offerId: string;
  productId: string;
  requestItem: string;
  quantity: number;
  unitPriceNet: number;
  currency: string;
  rationale: string;
};

export type OfferRow = {
  id: string;
  customerName: string | null;
  clientRequest: string | null;
  status: string;
  createdAt: Date;
  notes: string[];
  unmatched: string[];
  debugFragments: OfferDebugFragment[];
  items: OfferItemRow[];
};

export type OfferItemRow = {
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

type Tx = typeof db | Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

// ── Repository ─────────────────────────────────────────────────────────────────

export async function insertOffer(data: InsertOfferData, tx: Tx = db) {
  const [offer] = await tx.insert(offers).values(data).returning();
  return offer;
}

export async function insertOfferProducts(items: InsertOfferProductData[], tx: Tx = db) {
  if (items.length === 0) return;
  await tx.insert(offerProducts).values(items);
}

export async function insertOfferProduct(data: InsertOfferProductData, tx: Tx = db) {
  const [item] = await tx
    .insert(offerProducts)
    .values(data)
    .returning({ id: offerProducts.id });
  return item;
}

export async function updateOfferStatus(
  offerId: string,
  status: string,
  tx: Tx = db
) {
  const [offer] = await tx
    .update(offers)
    .set({ status, updatedAt: new Date() })
    .where(eq(offers.id, offerId))
    .returning({ id: offers.id });
  return offer ?? null;
}

export async function updateOfferProduct(
  offerProductId: string,
  offerId: string,
  data: { quantity: number },
  tx: Tx = db
) {
  await tx
    .update(offerProducts)
    .set({ quantity: data.quantity })
    .where(and(eq(offerProducts.id, offerProductId), eq(offerProducts.offerId, offerId)));
}

export async function deleteOfferProduct(
  offerProductId: string,
  offerId: string,
  tx: Tx = db
) {
  await tx
    .delete(offerProducts)
    .where(and(eq(offerProducts.id, offerProductId), eq(offerProducts.offerId, offerId)));
}

export async function findOfferById(id: string, tx: Tx = db): Promise<OfferRow | null> {
  const rows = await tx
    .select({
      offerId: offers.id,
      customerName: offers.customerName,
      clientRequest: offers.clientRequest,
      status: offers.status,
      createdAt: offers.createdAt,
      notes: offers.notes,
      unmatched: offers.unmatched,
      debugFragments: offers.debugFragments,
      offerProductId: offerProducts.id,
      productId: offerProducts.productId,
      productName: products.name,
      productSku: products.sku,
      productDescription: products.description,
      productManufacturer: products.manufacturer,
      requestItem: offerProducts.requestItem,
      quantity: offerProducts.quantity,
      unitPriceNet: offerProducts.unitPriceNet,
      currency: offerProducts.currency,
      rationale: offerProducts.rationale
    })
    .from(offers)
    .leftJoin(offerProducts, eq(offerProducts.offerId, offers.id))
    .leftJoin(products, eq(products.id, offerProducts.productId))
    .where(eq(offers.id, id));

  if (rows.length === 0) return null;

  const first = rows[0];
  return {
    id: first.offerId,
    customerName: first.customerName,
    clientRequest: first.clientRequest,
    status: first.status,
    createdAt: first.createdAt,
    notes: first.notes,
    unmatched: first.unmatched,
    debugFragments: first.debugFragments,
    items: rows
      .filter((row) => row.productId !== null)
      .map((row) => ({
        offerProductId: row.offerProductId!,
        productId: row.productId!,
        productName: row.productName!,
        productSku: row.productSku!,
        productDescription: row.productDescription!,
        productManufacturer: row.productManufacturer!,
        requestItem: row.requestItem!,
        quantity: row.quantity!,
        unitPriceNet: row.unitPriceNet ?? 0,
        currency: row.currency ?? "PLN",
        rationale: row.rationale!
      }))
  };
}

export async function getRecentOffers(limit: number = 10, tx: Tx = db) {
  return await tx
    .select({
      id: offers.id,
      name: offers.name,
      status: offers.status,
      customerName: offers.customerName,
      clientRequest: offers.clientRequest,
      notes: offers.notes,
      unmatched: offers.unmatched,
      createdAt: offers.createdAt,
      updatedAt: offers.updatedAt,
      productCount: sql<number>`COUNT(${offerProducts.id})`.mapWith(Number),
      totalPrice: sql<number>`COALESCE(SUM(${offerProducts.quantity} * ${offerProducts.unitPriceNet}), 0)`.mapWith(Number)
    })
    .from(offers)
    .leftJoin(offerProducts, eq(offerProducts.offerId, offers.id))
    .groupBy(offers.id)
    .orderBy(desc(offers.createdAt))
    .limit(limit);
}
