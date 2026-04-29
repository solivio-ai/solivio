import "server-only";

import type { Offer } from "@solivio/domain";

import { db } from "../database/db";
import type { GeneratedOffer } from "../agents/offerGenerationAgent";
import {
  findOfferById,
  insertOffer,
  insertOfferProducts,
  insertOfferProduct,
  updateOfferProduct,
  deleteOfferProduct,
  type OfferRow
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

function rowToCreatedOffer(row: OfferRow): CreatedOffer {
  return {
    id: row.id,
    customerName: row.customerName,
    clientRequest: row.clientRequest,
    status: row.status,
    generatedAt: row.createdAt.toISOString(),
    items: row.items,
    unmatched: row.unmatched,
    notes: row.notes
  };
}

export function toOfferDomain(offer: CreatedOffer): Offer {
  return {
    id: offer.id,
    requestId: offer.id,
    customerName: offer.customerName ?? undefined,
    clientRequest: offer.clientRequest ?? undefined,
    status: offer.status as Offer["status"],
    generatedAt: offer.generatedAt,
    notes: offer.notes,
    unmatched: offer.unmatched,
    items: offer.items.map((item) => ({
      offerProductId: item.offerProductId,
      productId: item.productId,
      quantity: item.quantity,
      rationale: item.rationale,
      requestItem: item.requestItem,
      product: {
        id: item.productId,
        sku: item.productSku,
        name: item.productName,
        description: item.productDescription,
        manufacturer: item.productManufacturer,
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

  return db.transaction(async (tx) => {
    const offer = await insertOffer(
      {
        customerName: customerName ?? null,
        clientRequest,
        status: "draft",
        notes: generated.notes,
        unmatched: [...generated.unmatched, ...extraUnmatched]
      },
      tx
    );

    await insertOfferProducts(
      items.map((item) => ({
        offerId: offer.id,
        productId: item.productId,
        requestItem: item.requestItem,
        quantity: item.quantity,
        rationale: item.rationale
      })),
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
  await insertOfferProduct({ offerId, productId, requestItem, quantity, rationale: "" });
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
