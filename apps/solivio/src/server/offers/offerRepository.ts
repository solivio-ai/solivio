import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { MatchSource, Offer, OfferStatus } from "@solivio/domain";

import { db } from "../database/db";
import { customers, requests } from "../../generated/schema";
import { offerItems, offers, products, users } from "../database/schema";

type Tx = typeof db | Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

// ── Insert payloads ────────────────────────────────────────────────────────────

export type InsertOfferData = {
  name: string;
  customerId: string | null;
  requestId: string | null;
  userId: string | null;
  status: OfferStatus;
  currency: string;
  notes: string[];
  unmatched: string[];
  discountPercent?: number;
  discountAmount?: number;
};

export type InsertOfferItemData = {
  offerId: string;
  productId: string | null;
  name: string;
  description: string;
  quantity: number;
  unitPriceNet: number;
  vatRate: number;
  unitGrossPrice: number;
  totalNet: number;
  totalGross: number;
  requestItem: string;
  rationale: string;
  matchSource: MatchSource | null;
  matchScore: number | null;
  position: number;
};

// ── Row shapes ─────────────────────────────────────────────────────────────────

export type OfferRow = {
  id: string;
  name: string;
  customerId: string | null;
  customerName: string | null;
  requestId: string | null;
  clientRequest: string | null;
  userId: string | null;
  userName: string | null;
  status: OfferStatus;
  currency: string;
  notes: string[];
  unmatched: string[];
  discountPercent: number;
  discountAmount: number;
  createdAt: Date;
  updatedAt: Date;
  items: OfferItemRow[];
};

export type OfferItemRow = {
  id: string;
  productId: string | null;
  productSku: string | null;
  name: string;
  description: string;
  quantity: number;
  unitPriceNet: number;
  vatRate: number;
  unitGrossPrice: number;
  totalNet: number;
  totalGross: number;
  requestItem: string;
  rationale: string;
  matchSource: MatchSource | null;
  matchScore: number | null;
  position: number;
};

// ── Inserts ────────────────────────────────────────────────────────────────────

export async function insertOffer(data: InsertOfferData, tx: Tx = db) {
  const [offer] = await tx.insert(offers).values(data).returning();
  return offer;
}

export async function insertOfferItems(items: InsertOfferItemData[], tx: Tx = db) {
  if (items.length === 0) return;
  await tx.insert(offerItems).values(items);
}

export async function insertOfferItem(data: InsertOfferItemData, tx: Tx = db) {
  const [item] = await tx.insert(offerItems).values(data).returning({ id: offerItems.id });
  return item;
}

// ── Updates ────────────────────────────────────────────────────────────────────

export type UpdateOfferMetaInput = {
  status?: OfferStatus;
  name?: string;
  currency?: string;
  customerId?: string | null;
  requestId?: string | null;
  discountPercent?: number;
  discountAmount?: number;
  notes?: string[];
  unmatched?: string[];
};

export async function updateOfferMeta(offerId: string, data: UpdateOfferMetaInput, tx: Tx = db) {
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.status !== undefined) patch.status = data.status;
  if (data.name !== undefined) patch.name = data.name;
  if (data.currency !== undefined) patch.currency = data.currency;
  if (data.customerId !== undefined) patch.customerId = data.customerId;
  if (data.requestId !== undefined) patch.requestId = data.requestId;
  if (data.discountPercent !== undefined) patch.discountPercent = data.discountPercent;
  if (data.discountAmount !== undefined) patch.discountAmount = data.discountAmount;
  if (data.notes !== undefined) patch.notes = data.notes;
  if (data.unmatched !== undefined) patch.unmatched = data.unmatched;

  const [offer] = await tx
    .update(offers)
    .set(patch)
    .where(eq(offers.id, offerId))
    .returning({ id: offers.id });
  return offer ?? null;
}

export async function touchOffer(offerId: string, userId: string | null, tx: Tx = db) {
  await tx.update(offers).set({ userId, updatedAt: new Date() }).where(eq(offers.id, offerId));
}

export async function lockOfferForUpdate(
  id: string,
  tx: Tx,
): Promise<{ id: string; status: OfferStatus } | null> {
  const rows = await tx
    .select({ id: offers.id, status: offers.status })
    .from(offers)
    .where(eq(offers.id, id))
    .for("update");
  return rows[0] ?? null;
}

export async function deleteOffer(offerId: string, tx: Tx = db) {
  const [row] = await tx.delete(offers).where(eq(offers.id, offerId)).returning({ id: offers.id });
  return row ?? null;
}

export async function updateOfferItem(
  offerItemId: string,
  offerId: string,
  data: {
    quantity?: number;
    unitPriceNet?: number;
    vatRate?: number;
    unitGrossPrice?: number;
    totalNet?: number;
    totalGross?: number;
  },
  tx: Tx = db,
) {
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (data.quantity !== undefined) patch.quantity = data.quantity;
  if (data.unitPriceNet !== undefined) patch.unitPriceNet = data.unitPriceNet;
  if (data.vatRate !== undefined) patch.vatRate = data.vatRate;
  if (data.unitGrossPrice !== undefined) patch.unitGrossPrice = data.unitGrossPrice;
  if (data.totalNet !== undefined) patch.totalNet = data.totalNet;
  if (data.totalGross !== undefined) patch.totalGross = data.totalGross;

  await tx
    .update(offerItems)
    .set(patch)
    .where(and(eq(offerItems.id, offerItemId), eq(offerItems.offerId, offerId)));
}

export async function deleteOfferItem(offerItemId: string, offerId: string, tx: Tx = db) {
  await tx
    .delete(offerItems)
    .where(and(eq(offerItems.id, offerItemId), eq(offerItems.offerId, offerId)));
}

// ── Reads ──────────────────────────────────────────────────────────────────────

const ownerUser = alias(users, "owner_user");

export async function findOfferById(id: string, tx: Tx = db): Promise<OfferRow | null> {
  const rows = await tx
    .select({
      offerId: offers.id,
      name: offers.name,
      status: offers.status,
      currency: offers.currency,
      notes: offers.notes,
      unmatched: offers.unmatched,
      discountPercent: offers.discountPercent,
      discountAmount: offers.discountAmount,
      createdAt: offers.createdAt,
      updatedAt: offers.updatedAt,
      customerId: offers.customerId,
      customerName: customers.name,
      requestId: offers.requestId,
      clientRequest: requests.rawText,
      userId: offers.userId,
      userName: ownerUser.name,
      itemId: offerItems.id,
      itemProductId: offerItems.productId,
      itemProductSku: products.sku,
      itemName: offerItems.name,
      itemDescription: offerItems.description,
      itemQuantity: offerItems.quantity,
      itemUnitPriceNet: offerItems.unitPriceNet,
      itemVatRate: offerItems.vatRate,
      itemUnitGrossPrice: offerItems.unitGrossPrice,
      itemTotalNet: offerItems.totalNet,
      itemTotalGross: offerItems.totalGross,
      itemRequestItem: offerItems.requestItem,
      itemRationale: offerItems.rationale,
      itemMatchSource: offerItems.matchSource,
      itemMatchScore: offerItems.matchScore,
      itemPosition: offerItems.position,
    })
    .from(offers)
    .leftJoin(customers, eq(customers.id, offers.customerId))
    .leftJoin(requests, eq(requests.id, offers.requestId))
    .leftJoin(ownerUser, eq(ownerUser.id, offers.userId))
    .leftJoin(offerItems, eq(offerItems.offerId, offers.id))
    .leftJoin(products, eq(products.id, offerItems.productId))
    .where(eq(offers.id, id))
    .orderBy(offerItems.position, offerItems.createdAt, offerItems.id);

  if (rows.length === 0) return null;

  const first = rows[0];
  return {
    id: first.offerId,
    name: first.name,
    customerId: first.customerId,
    customerName: first.customerName,
    requestId: first.requestId,
    clientRequest: first.clientRequest,
    userId: first.userId,
    userName: first.userName,
    status: first.status,
    currency: first.currency,
    notes: first.notes,
    unmatched: first.unmatched,
    discountPercent: first.discountPercent,
    discountAmount: first.discountAmount,
    createdAt: first.createdAt,
    updatedAt: first.updatedAt,
    items: rows
      .filter((row) => row.itemId !== null)
      .map((row) => ({
        id: row.itemId!,
        productId: row.itemProductId,
        productSku: row.itemProductSku,
        name: row.itemName!,
        description: row.itemDescription!,
        quantity: row.itemQuantity!,
        unitPriceNet: row.itemUnitPriceNet!,
        vatRate: row.itemVatRate!,
        unitGrossPrice: row.itemUnitGrossPrice!,
        totalNet: row.itemTotalNet!,
        totalGross: row.itemTotalGross!,
        requestItem: row.itemRequestItem!,
        rationale: row.itemRationale!,
        matchSource: row.itemMatchSource as MatchSource | null,
        matchScore: row.itemMatchScore,
        position: row.itemPosition!,
      })),
  };
}

export async function getRecentOffers(limit: number = 100, tx: Tx = db) {
  return await tx
    .select({
      id: offers.id,
      name: offers.name,
      status: offers.status,
      currency: offers.currency,
      customerId: offers.customerId,
      customerName: customers.name,
      requestId: offers.requestId,
      clientRequest: requests.rawText,
      notes: offers.notes,
      unmatched: offers.unmatched,
      discountPercent: offers.discountPercent,
      discountAmount: offers.discountAmount,
      createdAt: offers.createdAt,
      updatedAt: offers.updatedAt,
      itemCount: sql<number>`COUNT(${offerItems.id})`.mapWith(Number),
      totalNet: sql<number>`COALESCE(SUM(${offerItems.totalNet}), 0)`.mapWith(Number),
      totalGross: sql<number>`COALESCE(SUM(${offerItems.totalGross}), 0)`.mapWith(Number),
    })
    .from(offers)
    .leftJoin(customers, eq(customers.id, offers.customerId))
    .leftJoin(requests, eq(requests.id, offers.requestId))
    .leftJoin(offerItems, eq(offerItems.offerId, offers.id))
    .groupBy(offers.id, customers.name, requests.rawText)
    .orderBy(desc(offers.createdAt))
    .limit(limit);
}

// ── Domain mapping helper ──────────────────────────────────────────────────────

export function offerRowToDomain(row: OfferRow): Offer {
  return {
    id: row.id,
    customerId: row.customerId,
    requestId: row.requestId,
    userId: row.userId,
    name: row.name,
    status: row.status,
    currency: row.currency,
    discountPercent: row.discountPercent,
    discountAmount: row.discountAmount,
    notes: row.notes,
    unmatched: row.unmatched,
    customerName: row.customerName,
    clientRequest: row.clientRequest,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    userName: row.userName,
    items: row.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unitPriceNet: item.unitPriceNet,
      vatRate: item.vatRate,
      unitGrossPrice: item.unitGrossPrice,
      totalNet: item.totalNet,
      totalGross: item.totalGross,
      requestItem: item.requestItem,
      rationale: item.rationale,
      matchSource: item.matchSource,
      matchScore: item.matchScore,
      position: item.position,
      product: item.productId
        ? {
            id: item.productId,
            sku: item.productSku ?? undefined,
            name: item.name,
            description: item.description,
          }
        : null,
    })),
  };
}
