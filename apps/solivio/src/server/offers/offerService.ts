import "server-only";

import { inArray } from "drizzle-orm";

import type { MatchSource, Offer, OfferStatus } from "@solivio/domain";
import { OFFER_STATUS } from "@solivio/domain";

import type { GeneratedOffer } from "../agents/offerGenerationAgent";
import { appConfig } from "../config/appConfig";
import { upsertCustomerByName } from "../customers/customerRepository";
import { db } from "../database/db";
import { products } from "../database/schema";
import { findActivePricesForProducts } from "../products/productPriceRepository";
import { insertRequest } from "../requests/requestRepository";
import type { InsertOfferItemData, OfferRow, UpdateOfferMetaInput } from "./offerRepository";
import {
  deleteOfferItem,
  deleteOffer as deleteOfferRow,
  findOfferById,
  getRecentOffers,
  insertOffer,
  insertOfferItem,
  insertOfferItems,
  offerRowToDomain,
  updateOfferMeta as persistOfferMeta,
  touchOffer,
  updateOfferItem,
} from "./offerRepository";
import { saveRevision } from "./offerRevisionService";

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

function computeTotals(quantity: number, unitPriceNet: number, vatRate: number) {
  const unitGrossPrice = round4(unitPriceNet * (1 + vatRate / 100));
  const totalNet = round4(quantity * unitPriceNet);
  const totalGross = round4(quantity * unitGrossPrice);
  return { unitGrossPrice, totalNet, totalGross };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// ── Public service ─────────────────────────────────────────────────────────────

export async function createOffer(
  customerName: string | undefined,
  clientRequest: string,
  generated: GeneratedOffer,
  userId?: string | null,
  name?: string,
): Promise<Offer> {
  const { items, extraUnmatched } = deduplicateItems(generated);
  const offerCurrency = appConfig.defaultCurrency;

  // Validate products exist before we open a transaction.
  const productIds = items.map((i) => i.productId);
  const existingProducts =
    productIds.length > 0
      ? await db
          .select({ id: products.id, name: products.name, description: products.description })
          .from(products)
          .where(inArray(products.id, productIds))
      : [];
  const productMap = new Map(existingProducts.map((p) => [p.id, p]));
  const validItems = items.filter((item) => productMap.has(item.productId));
  const hallucinated = items
    .filter((item) => !productMap.has(item.productId))
    .map((item) => item.requestItem);

  const priceMap = await findActivePricesForProducts(
    validItems.map((i) => i.productId),
    offerCurrency,
  );

  const offerId = await db.transaction(async (tx) => {
    const customer = customerName?.trim()
      ? await upsertCustomerByName(customerName.trim(), "manual", tx)
      : null;

    const request = await insertRequest(
      {
        customerId: customer?.id ?? null,
        rawText: clientRequest,
        source: "manual",
      },
      tx,
    );

    const offer = await insertOffer(
      {
        name: name ?? "Draft",
        customerId: customer?.id ?? null,
        requestId: request.id,
        userId: userId ?? null,
        status: OFFER_STATUS.DRAFT,
        currency: offerCurrency,
        notes: generated.notes,
        unmatched: [...generated.unmatched, ...extraUnmatched, ...hallucinated],
      },
      tx,
    );

    const itemInserts: InsertOfferItemData[] = validItems.map((item, index) => {
      const product = productMap.get(item.productId)!;
      const price = priceMap.get(item.productId);
      const unitPriceNet = price?.net ?? 0;
      const vatRate = price?.vatRate ?? 23;
      const { unitGrossPrice, totalNet, totalGross } = computeTotals(
        item.quantity,
        unitPriceNet,
        vatRate,
      );
      const matchSource: MatchSource = item.matchSource ?? "semantic";
      const matchScore = item.matchScore ?? null;
      return {
        offerId: offer.id,
        productId: item.productId,
        name: product.name,
        description: product.description,
        quantity: item.quantity,
        unitPriceNet,
        vatRate,
        unitGrossPrice,
        totalNet,
        totalGross,
        requestItem: item.requestItem,
        rationale: item.rationale,
        matchSource,
        matchScore,
        position: index,
      };
    });

    await insertOfferItems(itemInserts, tx);

    return offer.id;
  });

  const created = await getOffer(offerId);
  if (!created) {
    throw new Error("Offer was created but could not be loaded");
  }
  return created;
}

export async function getOffer(id: string): Promise<Offer | null> {
  const row = await findOfferById(id);
  if (!row) return null;
  return offerRowToDomain(row);
}

export async function updateOfferStatusAndFetch(
  offerId: string,
  status: OfferStatus,
  userId?: string | null,
): Promise<Offer | null> {
  return updateOfferMeta(offerId, { status }, userId);
}

export async function updateOfferMeta(
  offerId: string,
  data: UpdateOfferMetaInput,
  userId?: string | null,
): Promise<Offer | null> {
  return db.transaction(async (tx) => {
    const existing = await findOfferById(offerId, tx);
    if (!existing) return null;

    // Locked offer can only be reopened to draft.
    if (existing.status === OFFER_STATUS.ACCEPTED && data.status !== OFFER_STATUS.DRAFT) {
      return null;
    }

    const updated = await persistOfferMeta(offerId, data, tx);
    if (!updated) return null;

    if (userId !== undefined) {
      await touchOffer(offerId, userId ?? null, tx);
    }

    const hasContentChanges = Object.keys(data).some((key) => key !== "status");
    if (data.status === OFFER_STATUS.ACCEPTED) {
      await saveRevision(offerId, userId ?? null, new Date(), tx);
    } else if (hasContentChanges) {
      await saveRevision(offerId, userId ?? null, undefined, tx);
    }

    const row = await findOfferById(offerId, tx);
    return row ? offerRowToDomain(row) : null;
  });
}

export async function deleteOffer(offerId: string): Promise<boolean> {
  const existing = await findOfferById(offerId);
  if (!existing) return false;
  await deleteOfferRow(offerId);
  return true;
}

// ── Line item operations ───────────────────────────────────────────────────────

export async function addProductToOffer(
  offerId: string,
  productId: string,
  quantity: number,
  requestItem = "",
  userId?: string | null,
  rationale = "",
): Promise<Offer | null | "duplicate" | "locked"> {
  const existing = await findOfferById(offerId);
  if (!existing) return null;
  if (existing.status === OFFER_STATUS.ACCEPTED) return "locked";

  if (existing.items.some((i) => i.productId === productId)) return "duplicate";

  const [product] = await db
    .select({ id: products.id, name: products.name, description: products.description })
    .from(products)
    .where(inArray(products.id, [productId]));
  if (!product) return null;

  const priceMap = await findActivePricesForProducts([productId], existing.currency);
  const price = priceMap.get(productId);
  const unitPriceNet = price?.net ?? 0;
  const vatRate = price?.vatRate ?? 23;
  const { unitGrossPrice, totalNet, totalGross } = computeTotals(quantity, unitPriceNet, vatRate);

  await insertOfferItem({
    offerId,
    productId,
    name: product.name,
    description: product.description,
    quantity,
    unitPriceNet,
    vatRate,
    unitGrossPrice,
    totalNet,
    totalGross,
    requestItem,
    rationale,
    matchSource: "manual",
    matchScore: null,
    position: existing.items.length,
  });
  await touchOffer(offerId, userId ?? null);
  await saveRevision(offerId, userId ?? null);
  return getOffer(offerId);
}

export async function updateOfferLineItem(
  offerItemId: string,
  offerId: string,
  quantity: number,
  userId?: string | null,
): Promise<Offer | null | "locked"> {
  const existing = await findOfferById(offerId);
  if (!existing) return null;
  if (existing.status === OFFER_STATUS.ACCEPTED) return "locked";

  const item = existing.items.find((i) => i.id === offerItemId);
  if (!item) return null;

  const { unitGrossPrice, totalNet, totalGross } = computeTotals(
    quantity,
    item.unitPriceNet,
    item.vatRate,
  );

  await updateOfferItem(offerItemId, offerId, {
    quantity,
    unitGrossPrice,
    totalNet,
    totalGross,
  });
  await touchOffer(offerId, userId ?? null);
  await saveRevision(offerId, userId ?? null);
  return getOffer(offerId);
}

export async function removeOfferLineItem(
  offerItemId: string,
  offerId: string,
  userId?: string | null,
): Promise<boolean | "locked"> {
  const existing = await findOfferById(offerId);
  if (!existing) return false;
  if (existing.status === OFFER_STATUS.ACCEPTED) return "locked";

  const item = existing.items.find((i) => i.id === offerItemId);
  if (!item) return false;
  await deleteOfferItem(offerItemId, offerId);
  await touchOffer(offerId, userId ?? null);
  await saveRevision(offerId, userId ?? null);
  return true;
}

export async function getOffers() {
  return getRecentOffers(100);
}

export { getRecentOffers };

// ── Bulk operations ────────────────────────────────────────────────────────────

type BulkAddItem = {
  productId: string;
  quantity: number;
  requestItem?: string;
  rationale?: string;
};

type BulkAddItemResult = {
  productId: string;
  status: "added" | "duplicate" | "not_found" | "locked";
};

export async function bulkAddProductsToOffer(
  offerId: string,
  items: BulkAddItem[],
  userId?: string | null,
): Promise<{ results: BulkAddItemResult[]; offer: Offer | null }> {
  const results: BulkAddItemResult[] = [];

  for (const item of items) {
    const outcome = await addProductToOffer(
      offerId,
      item.productId,
      item.quantity,
      item.requestItem ?? "",
      userId,
      item.rationale ?? "",
    );

    if (outcome === null) {
      results.push({ productId: item.productId, status: "not_found" });
    } else if (outcome === "duplicate") {
      results.push({ productId: item.productId, status: "duplicate" });
    } else if (outcome === "locked") {
      results.push({ productId: item.productId, status: "locked" });
    } else {
      results.push({ productId: item.productId, status: "added" });
    }
  }

  const finalOffer = await getOffer(offerId);
  return { results, offer: finalOffer };
}

// ── Re-exports for callers expecting OfferRow shape ────────────────────────────

export type { OfferRow };
