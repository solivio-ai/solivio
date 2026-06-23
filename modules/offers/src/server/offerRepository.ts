import "server-only";

import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";

import type {
  MatchSource,
  Offer,
  OfferKbArticle,
  OfferStatus,
  OfferUnmatchedItem,
  OfferUnmatchedItemInput,
} from "@solivio/domain";
import { OFFER_STATUS } from "@solivio/domain";
import { db, getService } from "@solivio/sdk/runtime";

import { offerItems, offers, offerUnmatchedItems } from "../data/schema.ts";

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
  kbArticles?: OfferKbArticle[];
  discountPercent?: number;
  discountAmount?: number;
  createdAt?: Date;
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

export type InsertOfferUnmatchedItemData = {
  offerId: string;
  item: string;
  reason: string;
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
  kbArticles: OfferKbArticle[];
  unmatched: OfferUnmatchedItem[];
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

export type RecentOfferRow = {
  id: string;
  name: string;
  status: OfferStatus;
  currency: string;
  customerId: string | null;
  customerName: string | null;
  requestId: string | null;
  clientRequest: string | null;
  notes: string[];
  discountPercent: number;
  discountAmount: number;
  createdAt: Date;
  updatedAt: Date;
  itemCount: number;
  unmatchedCount: number;
  totalNet: number;
  totalGross: number;
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

export async function insertOfferUnmatchedItems(
  items: InsertOfferUnmatchedItemData[],
  tx: Tx = db,
) {
  if (items.length === 0) return [];
  return await tx.insert(offerUnmatchedItems).values(items).returning();
}

export async function deleteOfferUnmatchedByOfferId(offerId: string, tx: Tx = db) {
  await tx.delete(offerUnmatchedItems).where(eq(offerUnmatchedItems.offerId, offerId));
}

export async function replaceOfferUnmatched(
  offerId: string,
  items: OfferUnmatchedItemInput[],
  tx: Tx = db,
) {
  await deleteOfferUnmatchedByOfferId(offerId, tx);
  if (items.length === 0) return [];
  return await insertOfferUnmatchedItems(
    items.map((entry, index) => ({
      offerId,
      item: entry.item,
      reason: entry.reason,
      position: index,
    })),
    tx,
  );
}

// ── Reads (unmatched) ──────────────────────────────────────────────────────────

export async function findUnmatchedByOfferId(
  offerId: string,
  tx: Tx = db,
): Promise<OfferUnmatchedItem[]> {
  const rows = await tx
    .select({
      id: offerUnmatchedItems.id,
      item: offerUnmatchedItems.item,
      reason: offerUnmatchedItems.reason,
      position: offerUnmatchedItems.position,
    })
    .from(offerUnmatchedItems)
    .where(eq(offerUnmatchedItems.offerId, offerId))
    .orderBy(
      asc(offerUnmatchedItems.position),
      asc(offerUnmatchedItems.createdAt),
      asc(offerUnmatchedItems.id),
    );

  return rows.map((row) => ({
    id: row.id,
    item: row.item,
    reason: row.reason,
    position: row.position,
  }));
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
  unmatched?: OfferUnmatchedItemInput[];
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

  const [offer] = await tx
    .update(offers)
    .set(patch)
    .where(eq(offers.id, offerId))
    .returning({ id: offers.id });

  if (!offer) return null;

  if (data.unmatched !== undefined) {
    await replaceOfferUnmatched(offerId, data.unmatched, tx);
  }

  return offer;
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

export async function findOfferById(id: string, tx: Tx = db): Promise<OfferRow | null> {
  // Reads the offer, its items, and its unmatched rows in separate queries —
  // run them under one repeatable-read transaction so they see a consistent
  // snapshot when no caller-provided tx is in play.
  if (tx === db) {
    return db.transaction((innerTx) => findOfferById(id, innerTx), {
      isolationLevel: "repeatable read",
    });
  }

  const [offer] = await tx.select().from(offers).where(eq(offers.id, id)).limit(1);
  if (!offer) return null;

  const items = await tx
    .select()
    .from(offerItems)
    .where(eq(offerItems.offerId, id))
    .orderBy(offerItems.position, offerItems.createdAt, offerItems.id);

  // Cross-module references are id-only: enrich display data through the
  // owning modules' services instead of SQL joins.
  const productIds = [
    ...new Set(items.map((item) => item.productId).filter((v): v is string => v !== null)),
  ];
  const [customer, request, userRows, productRows] = await Promise.all([
    offer.customerId ? getService("customers").findById(offer.customerId) : null,
    offer.requestId ? getService("customers").findRequestById(offer.requestId) : null,
    offer.userId ? getService("users").findDisplayByIds([offer.userId]) : [],
    productIds.length > 0 ? getService("catalog").getProductsByIds(productIds) : [],
  ]);
  const skuByProductId = new Map(productRows.map((product) => [product.id, product.sku]));
  const unmatched = await findUnmatchedByOfferId(id, tx);

  return {
    id: offer.id,
    name: offer.name,
    customerId: offer.customerId,
    customerName: customer?.name ?? null,
    requestId: offer.requestId,
    clientRequest: request?.rawText ?? null,
    userId: offer.userId,
    userName: userRows[0]?.name ?? null,
    status: offer.status,
    currency: offer.currency,
    notes: offer.notes,
    kbArticles: offer.kbArticles ?? [],
    unmatched,
    discountPercent: offer.discountPercent,
    discountAmount: offer.discountAmount,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
    items: items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productSku: item.productId ? (skuByProductId.get(item.productId) ?? null) : null,
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
      matchSource: item.matchSource as MatchSource | null,
      matchScore: item.matchScore,
      position: item.position,
    })),
  };
}

export async function getRecentOffers(limit: number = 100, tx: Tx = db) {
  const rows = await tx
    .select({
      id: offers.id,
      name: offers.name,
      status: offers.status,
      currency: offers.currency,
      customerId: offers.customerId,
      requestId: offers.requestId,
      notes: offers.notes,
      discountPercent: offers.discountPercent,
      discountAmount: offers.discountAmount,
      createdAt: offers.createdAt,
      updatedAt: offers.updatedAt,
      itemCount: sql<number>`COUNT(DISTINCT ${offerItems.id})`.mapWith(Number),
      // Correlated subquery instead of a second LEFT JOIN: joining both child
      // tables on offers.id would fan out to N×M rows and inflate the SUMs.
      unmatchedCount: sql<number>`(
        SELECT COUNT(*) FROM ${offerUnmatchedItems}
        WHERE ${offerUnmatchedItems.offerId} = ${offers.id}
      )`.mapWith(Number),
      totalNet: sql<number>`COALESCE(SUM(${offerItems.totalNet}), 0)`.mapWith(Number),
      totalGross: sql<number>`COALESCE(SUM(${offerItems.totalGross}), 0)`.mapWith(Number),
    })
    .from(offers)
    .leftJoin(offerItems, eq(offerItems.offerId, offers.id))
    .where(ne(offers.status, OFFER_STATUS.IMPORTED))
    .groupBy(offers.id)
    .orderBy(desc(offers.createdAt))
    .limit(limit);

  const customerIds = [
    ...new Set(rows.map((row) => row.customerId).filter((v): v is string => v !== null)),
  ];
  const requestIds = [
    ...new Set(rows.map((row) => row.requestId).filter((v): v is string => v !== null)),
  ];
  const [customerRows, requestRows] = await Promise.all([
    getService("customers").findByIds(customerIds),
    getService("customers").findRequestsByIds(requestIds),
  ]);
  const customerNameById = new Map(customerRows.map((row) => [row.id, row.name]));
  const requestTextById = new Map(requestRows.map((row) => [row.id, row.rawText]));

  return rows.map((row) => ({
    ...row,
    customerName: row.customerId ? (customerNameById.get(row.customerId) ?? null) : null,
    clientRequest: row.requestId ? (requestTextById.get(row.requestId) ?? null) : null,
  }));
}

export async function findRecentOffersByCustomer(
  customerId: string,
  { limit = 10 }: { limit?: number } = {},
  tx: Tx = db,
): Promise<OfferRow[]> {
  const HISTORY_STATUSES = [OFFER_STATUS.IMPORTED, OFFER_STATUS.ACCEPTED] as const;

  const offerRows = await tx
    .select()
    .from(offers)
    .where(and(eq(offers.customerId, customerId), inArray(offers.status, [...HISTORY_STATUSES])))
    .orderBy(desc(offers.createdAt))
    .limit(limit);

  if (offerRows.length === 0) return [];

  const ids = offerRows.map((row) => row.id);
  const items = await tx
    .select()
    .from(offerItems)
    .where(inArray(offerItems.offerId, ids))
    .orderBy(offerItems.position, offerItems.createdAt, offerItems.id);

  const unmatchedRows = await tx
    .select()
    .from(offerUnmatchedItems)
    .where(inArray(offerUnmatchedItems.offerId, ids))
    .orderBy(
      asc(offerUnmatchedItems.position),
      asc(offerUnmatchedItems.createdAt),
      asc(offerUnmatchedItems.id),
    );
  const unmatchedByOfferId = new Map<string, OfferUnmatchedItem[]>();
  for (const row of unmatchedRows) {
    const list = unmatchedByOfferId.get(row.offerId) ?? [];
    list.push({ id: row.id, item: row.item, reason: row.reason, position: row.position });
    unmatchedByOfferId.set(row.offerId, list);
  }

  // Cross-module references are id-only: enrich display data through the
  // owning modules' services instead of SQL joins.
  const requestIds = [
    ...new Set(offerRows.map((row) => row.requestId).filter((v): v is string => v !== null)),
  ];
  const productIds = [
    ...new Set(items.map((item) => item.productId).filter((v): v is string => v !== null)),
  ];
  const [customerRows, requestRows, productRows] = await Promise.all([
    getService("customers").findByIds([customerId]),
    getService("customers").findRequestsByIds(requestIds),
    productIds.length > 0 ? getService("catalog").getProductsByIds(productIds) : [],
  ]);
  const customerName = customerRows[0]?.name ?? null;
  const requestTextById = new Map(requestRows.map((row) => [row.id, row.rawText]));
  const skuByProductId = new Map(productRows.map((product) => [product.id, product.sku]));

  return offerRows.map((offer) => ({
    id: offer.id,
    name: offer.name,
    customerId: offer.customerId,
    customerName,
    requestId: offer.requestId,
    clientRequest: offer.requestId ? (requestTextById.get(offer.requestId) ?? null) : null,
    userId: offer.userId,
    userName: null,
    status: offer.status,
    currency: offer.currency,
    notes: offer.notes,
    kbArticles: offer.kbArticles ?? [],
    unmatched: unmatchedByOfferId.get(offer.id) ?? [],
    discountPercent: offer.discountPercent,
    discountAmount: offer.discountAmount,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
    items: items
      .filter((item) => item.offerId === offer.id)
      .map((item) => ({
        id: item.id,
        productId: item.productId,
        productSku: item.productId ? (skuByProductId.get(item.productId) ?? null) : null,
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
        matchSource: item.matchSource as MatchSource | null,
        matchScore: item.matchScore,
        position: item.position,
      })),
  }));
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
    kbArticles: row.kbArticles ?? [],
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
