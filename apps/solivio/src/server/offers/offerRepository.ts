import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "../database/db";
import type { Offer } from "@solivio/domain";

import { offerProducts, offers, products, user } from "../database/schema";

const createdByUser = alias(user, "created_by_user");
const updatedByUser = alias(user, "updated_by_user");

// ── Types ──────────────────────────────────────────────────────────────────────

export type InsertOfferData = {
  name: string;
  customerName: string | null;
  clientRequest: string;
  status: Offer["status"];
  notes: string[];
  unmatched: string[];
  discountPercent?: number;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type InsertOfferProductData = {
  offerId: string;
  productId: string;
  requestItem: string;
  quantity: number;
  unitPriceNet: number;
  currency: string;
  rationale: string;
  position: number;
};

export type OfferRow = {
  id: string;
  name: string;
  customerName: string | null;
  clientRequest: string | null;
  status: Offer["status"];
  createdAt: Date;
  updatedAt: Date;
  notes: string[];
  unmatched: string[];
  discountPercent: number;
  createdBy: string | null;
  createdByName: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
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
  position: number;
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

export type UpdateOfferMetaInput = {
  status?: Offer["status"];
  name?: string;
  customerName?: string | null;
  clientRequest?: string | null;
  discountPercent?: number;
  unmatched?: string[];
};

export async function updateOfferMeta(
  offerId: string,
  data: UpdateOfferMetaInput,
  tx: Tx = db
) {
  const patch: {
    updatedAt: Date;
    status?: Offer["status"];
    name?: string;
    customerName?: string | null;
    clientRequest?: string | null;
    discountPercent?: number;
    unmatched?: string[];
  } = { updatedAt: new Date() };
  if (data.status !== undefined) patch.status = data.status;
  if (data.name !== undefined) patch.name = data.name;
  if (data.customerName !== undefined) patch.customerName = data.customerName;
  if (data.clientRequest !== undefined) patch.clientRequest = data.clientRequest;
  if (data.discountPercent !== undefined) patch.discountPercent = data.discountPercent;
  if (data.unmatched !== undefined) patch.unmatched = data.unmatched;

  const [offer] = await tx
    .update(offers)
    .set(patch)
    .where(eq(offers.id, offerId))
    .returning({ id: offers.id });
  return offer ?? null;
}

export async function setOfferUpdatedBy(
  offerId: string,
  updatedBy: string | null,
  tx: Tx = db
) {
  await tx
    .update(offers)
    .set({ updatedBy, updatedAt: new Date() })
    .where(eq(offers.id, offerId));
}

export async function deleteOffer(offerId: string, tx: Tx = db) {
  const [row] = await tx
    .delete(offers)
    .where(eq(offers.id, offerId))
    .returning({ id: offers.id });
  return row ?? null;
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
      name: offers.name,
      customerName: offers.customerName,
      clientRequest: offers.clientRequest,
      status: offers.status,
      createdAt: offers.createdAt,
      updatedAt: offers.updatedAt,
      notes: offers.notes,
      unmatched: offers.unmatched,
      discountPercent: offers.discountPercent,
      createdBy: offers.createdBy,
      createdByName: createdByUser.name,
      updatedBy: offers.updatedBy,
      updatedByName: updatedByUser.name,
      offerProductId: offerProducts.id,
      productId: offerProducts.productId,
      productName: products.name,
      productSku: products.sku,
      productDescription: products.description,
      productManufacturer: products.manufacturer,
      requestItem: offerProducts.requestItem,
      quantity: offerProducts.quantity,
      unitPriceNet: sql<number>`CASE WHEN ${offers.status} = 'draft' THEN COALESCE(${products.priceNet}, ${offerProducts.unitPriceNet}) ELSE ${offerProducts.unitPriceNet} END`.mapWith(Number),
      currency: offerProducts.currency,
      rationale: offerProducts.rationale,
      position: offerProducts.position
    })
    .from(offers)
    .leftJoin(createdByUser, eq(createdByUser.id, offers.createdBy))
    .leftJoin(updatedByUser, eq(updatedByUser.id, offers.updatedBy))
    .leftJoin(offerProducts, eq(offerProducts.offerId, offers.id))
    .leftJoin(products, eq(products.id, offerProducts.productId))
    .where(eq(offers.id, id))
    .orderBy(offerProducts.position, offerProducts.createdAt, offerProducts.id);

  if (rows.length === 0) return null;

  const first = rows[0];
  return {
    id: first.offerId,
    name: first.name,
    customerName: first.customerName,
    clientRequest: first.clientRequest,
    status: first.status,
    createdAt: first.createdAt,
    updatedAt: first.updatedAt,
    notes: first.notes,
    unmatched: first.unmatched,
    discountPercent: first.discountPercent ?? 0,
    createdBy: first.createdBy,
    createdByName: first.createdByName,
    updatedBy: first.updatedBy,
    updatedByName: first.updatedByName,
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
        rationale: row.rationale!,
        position: row.position!
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
      discountPercent: offers.discountPercent,
      createdAt: offers.createdAt,
      updatedAt: offers.updatedAt,
      productCount: sql<number>`COUNT(${offerProducts.id})`.mapWith(Number),
      totalPrice: sql<number>`COALESCE(SUM(${offerProducts.quantity} * CASE WHEN ${offers.status} = 'draft' THEN COALESCE(${products.priceNet}, ${offerProducts.unitPriceNet}) ELSE ${offerProducts.unitPriceNet} END), 0)`.mapWith(Number),
      currency: sql<string>`COALESCE(MIN(CASE WHEN ${offers.status} = 'draft' THEN COALESCE(${products.currency}, ${offerProducts.currency}) ELSE ${offerProducts.currency} END), 'PLN')`
    })
    .from(offers)
    .leftJoin(offerProducts, eq(offerProducts.offerId, offers.id))
    .leftJoin(products, eq(products.id, offerProducts.productId))
    .groupBy(offers.id)
    .orderBy(desc(offers.createdAt))
    .limit(limit);
}
