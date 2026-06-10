import "server-only";

import type { MatchSource, Offer, OfferStatus } from "@solivio/domain";
import { db, getService } from "@solivio/sdk/runtime";

import type { GeneratedOffer } from "../ai/agents/offerGenerationAgent.ts";
import { appConfig } from "./appConfig.ts";
import type { InsertOfferItemData, OfferRow, UpdateOfferMetaInput } from "./offerRepository.ts";
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
} from "./offerRepository.ts";
import { saveRevision } from "./offerRevisionService.ts";

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
  customerId?: string | null,
): Promise<Offer> {
  const { items, extraUnmatched } = deduplicateItems(generated);
  const offerCurrency = appConfig.defaultCurrency;

  // Validate products exist before we open a transaction.
  const catalog = getService("catalog");
  const productIds = items.map((i) => i.productId);
  const existingProducts = await catalog.getProductsByIds(productIds);
  const productMap = new Map(existingProducts.map((p) => [p.id, p]));
  const validItems = items.filter((item) => productMap.has(item.productId));
  const hallucinated = items
    .filter((item) => !productMap.has(item.productId))
    .map((item) => item.requestItem);

  const priceMap = await catalog.getActivePricesForProducts(
    validItems.map((i) => i.productId),
    offerCurrency,
  );

  // Customer resolution and request intake run before the offer transaction:
  // the upsert is idempotent and concurrency-safe inside the customers module,
  // and an intake request row without an offer is harmless.
  const customersService = getService("customers");
  const customer = await customersService.resolveCustomer({ customerId, customerName }, "manual");
  const request = await customersService.createRequest({
    customerId: customer?.id ?? null,
    rawText: clientRequest,
    source: "manual",
  });

  const offerId = await db.transaction(async (tx) => {
    const offer = await insertOffer(
      {
        name: name ?? "Draft",
        customerId: customer?.id ?? null,
        requestId: request.id,
        userId: userId ?? null,
        status: "draft",
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
  data: UpdateOfferMetaInput & { customerName?: string | null },
  userId?: string | null,
): Promise<Offer | null> {
  // Customer resolution runs before the transaction (idempotent upsert inside
  // the customers module; a stray upsert when the offer turns out missing or
  // locked is harmless).
  const { customerName, ...rest } = data;
  let resolvedCustomerId: string | null | undefined;
  if (data.customerId) {
    const customer = await getService("customers").resolveCustomer(
      { customerId: data.customerId, customerName },
      "manual",
    );
    resolvedCustomerId = customer?.id ?? null;
  } else if (customerName !== undefined) {
    const customer = await getService("customers").resolveCustomer({ customerName }, "manual");
    resolvedCustomerId = customer?.id ?? null;
  }

  return db.transaction(async (tx) => {
    const existing = await findOfferById(offerId, tx);
    if (!existing) return null;

    // Locked offer can only be reopened to draft.
    if (existing.status === "accepted" && data.status !== "draft") {
      return null;
    }

    const patch: UpdateOfferMetaInput = { ...rest };
    if (resolvedCustomerId !== undefined) {
      patch.customerId = resolvedCustomerId;
    }
    // When customerId is explicitly null and no name is given, `patch` already
    // carries `customerId: null` from the `...rest` spread, so no branch is needed.

    const definedPatch = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    ) as UpdateOfferMetaInput;

    const updated = await persistOfferMeta(offerId, definedPatch, tx);
    if (!updated) return null;

    if (userId !== undefined) {
      await touchOffer(offerId, userId ?? null, tx);
    }

    const hasContentChanges = Object.keys(definedPatch).some((key) => key !== "status");
    if (data.status === "accepted") {
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
  if (existing.status === "accepted") return "locked";

  if (existing.items.some((i) => i.productId === productId)) return "duplicate";

  const catalog = getService("catalog");
  const [product] = await catalog.getProductsByIds([productId]);
  if (!product) return null;

  const priceMap = await catalog.getActivePricesForProducts([productId], existing.currency);
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
  if (existing.status === "accepted") return "locked";

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
  if (existing.status === "accepted") return "locked";

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
