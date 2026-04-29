import "server-only";

import type { Offer } from "@solivio/domain";

import { db } from "../database/db";
import type { GeneratedOffer } from "../agents/offerGenerationAgent";
import {
  findOfferById,
  insertOffer,
  insertOfferProducts,
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
    items: offer.items.map((item) => ({
      offerProductId: item.offerProductId,
      productId: item.productId,
      quantity: item.quantity,
      rationale: item.rationale,
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
