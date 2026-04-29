import "server-only";

import type { Offer } from "@solivio/domain";

import { db } from "../database/db";
import type { GeneratedOffer } from "../agents/offerGenerationAgent";
import {
  findLatestRevision,
  findRevisionById,
  insertOffer,
  insertRevision,
  listOffers as listOffersFromRepo,
  listRevisions,
  type FullRevisionRow
} from "./offerRepository";

// ── Types ──────────────────────────────────────────────────────────────────────

export type OfferLineItem = {
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
  name: string;
  customerName: string | null;
  clientRequest: string | null;
  revisionId: string;
  revisionNumber: number;
  status: string;
  generatedAt: string;
  items: OfferLineItem[];
  unmatched: string[];
  notes: string[];
};

export type OfferSummary = {
  id: string;
  name: string;
  customerName: string | null;
  status: string;
  revisionNumber: number;
  createdAt: string;
  updatedAt: string;
};

export type RevisionSummary = {
  revisionId: string;
  revisionNumber: number;
  status: string;
  userId: string;
  createdAt: string;
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

function rowToCreatedOffer(row: FullRevisionRow): CreatedOffer {
  return {
    id: row.offer.id,
    name: row.offer.name,
    customerName: row.offer.customerName,
    clientRequest: row.offer.clientRequest,
    revisionId: row.revision.id,
    revisionNumber: row.revision.revisionNumber,
    status: row.revision.status,
    generatedAt: row.revision.createdAt.toISOString(),
    items: row.products,
    unmatched: row.revision.unmatched,
    notes: row.revision.notes
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
    revisionId: offer.revisionId,
    revisionNumber: offer.revisionNumber,
    notes: offer.notes,
    items: offer.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      rationale: item.rationale,
      product: {
        id: item.productId,
        sku: item.productSku,
        name: item.productName,
        description: item.productDescription,
        manufacturer: item.productManufacturer,
        source: "database" as const
      }
    }))
  };
}

// ── Service ────────────────────────────────────────────────────────────────────

export async function createOffer(
  customerName: string | undefined,
  clientRequest: string,
  generated: GeneratedOffer,
  userId: string
): Promise<CreatedOffer> {
  const { items, extraUnmatched } = deduplicateItems(generated);

  return db.transaction(async (tx) => {
    const offer = await insertOffer({ customerName: customerName ?? null, clientRequest, userId }, tx);

    await insertRevision(
      {
        offerId: offer.id,
        status: "draft",
        notes: generated.notes,
        unmatched: [...generated.unmatched, ...extraUnmatched],
        userId
      },
      items.map((item) => ({
        productId: item.productId,
        requestItem: item.requestItem,
        quantity: item.quantity,
        rationale: item.rationale
      })),
      tx
    );

    const row = await findLatestRevision(offer.id, tx);
    return rowToCreatedOffer(row!);
  });
}

export async function getOffer(id: string): Promise<Offer | null> {
  const row = await findLatestRevision(id);
  if (!row) return null;
  return toOfferDomain(rowToCreatedOffer(row));
}

export async function listOffers(): Promise<OfferSummary[]> {
  const rows = await listOffersFromRepo();
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    customerName: row.customerName,
    status: row.status,
    revisionNumber: row.revisionNumber,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }));
}

export async function getOfferRevision(offerId: string, revisionId: string): Promise<Offer | null> {
  const row = await findRevisionById(revisionId, offerId);
  if (!row) return null;
  return toOfferDomain(rowToCreatedOffer(row));
}

export async function listOfferRevisions(offerId: string): Promise<RevisionSummary[]> {
  const rows = await listRevisions(offerId);
  return rows.map((row) => ({
    revisionId: row.id,
    revisionNumber: row.revisionNumber,
    status: row.status,
    userId: row.userId,
    createdAt: row.createdAt.toISOString()
  }));
}

export async function updateOfferStatus(
  offerId: string,
  status: string,
  userId: string
): Promise<CreatedOffer | null> {
  return db.transaction(async (tx) => {
    const current = await findLatestRevision(offerId, tx);
    if (!current) return null;

    await insertRevision(
      {
        offerId,
        status,
        notes: current.revision.notes,
        unmatched: current.revision.unmatched,
        userId
      },
      current.products.map((p) => ({
        productId: p.productId,
        requestItem: p.requestItem,
        quantity: p.quantity,
        rationale: p.rationale
      })),
      tx
    );

    const row = await findLatestRevision(offerId, tx);
    return rowToCreatedOffer(row!);
  });
}

export async function addProductToOffer(
  offerId: string,
  productId: string,
  quantity: number,
  requestItem = "",
  userId: string
): Promise<CreatedOffer | null | "duplicate"> {
  return db.transaction(async (tx) => {
    const current = await findLatestRevision(offerId, tx);
    if (!current) return null;

    if (current.products.find((p) => p.productId === productId)) return "duplicate";

    await insertRevision(
      {
        offerId,
        status: current.revision.status,
        notes: current.revision.notes,
        unmatched: current.revision.unmatched,
        userId
      },
      [
        ...current.products.map((p) => ({
          productId: p.productId,
          requestItem: p.requestItem,
          quantity: p.quantity,
          rationale: p.rationale
        })),
        { productId, requestItem, quantity, rationale: "" }
      ],
      tx
    );

    const row = await findLatestRevision(offerId, tx);
    return rowToCreatedOffer(row!);
  });
}

export async function updateOfferLineItem(
  productId: string,
  offerId: string,
  quantity: number,
  userId: string
): Promise<CreatedOffer | null> {
  return db.transaction(async (tx) => {
    const current = await findLatestRevision(offerId, tx);
    if (!current) return null;

    if (!current.products.find((p) => p.productId === productId)) return null;

    await insertRevision(
      {
        offerId,
        status: current.revision.status,
        notes: current.revision.notes,
        unmatched: current.revision.unmatched,
        userId
      },
      current.products.map((p) => ({
        productId: p.productId,
        requestItem: p.requestItem,
        quantity: p.productId === productId ? quantity : p.quantity,
        rationale: p.rationale
      })),
      tx
    );

    const row = await findLatestRevision(offerId, tx);
    return rowToCreatedOffer(row!);
  });
}

export async function removeOfferLineItem(
  productId: string,
  offerId: string,
  userId: string
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const current = await findLatestRevision(offerId, tx);
    if (!current) return false;

    if (!current.products.find((p) => p.productId === productId)) return false;

    await insertRevision(
      {
        offerId,
        status: current.revision.status,
        notes: current.revision.notes,
        unmatched: current.revision.unmatched,
        userId
      },
      current.products
        .filter((p) => p.productId !== productId)
        .map((p) => ({
          productId: p.productId,
          requestItem: p.requestItem,
          quantity: p.quantity,
          rationale: p.rationale
        })),
      tx
    );

    return true;
  });
}

export async function restoreRevision(
  offerId: string,
  revisionId: string,
  userId: string
): Promise<CreatedOffer | null> {
  return db.transaction(async (tx) => {
    const target = await findRevisionById(revisionId, offerId, tx);
    if (!target) return null;

    await insertRevision(
      {
        offerId,
        status: target.revision.status,
        notes: target.revision.notes,
        unmatched: target.revision.unmatched,
        userId
      },
      target.products.map((p) => ({
        productId: p.productId,
        requestItem: p.requestItem,
        quantity: p.quantity,
        rationale: p.rationale
      })),
      tx
    );

    const row = await findLatestRevision(offerId, tx);
    return rowToCreatedOffer(row!);
  });
}
