import "server-only";

import { and, desc, eq, max } from "drizzle-orm";

import { db } from "../database/db";
import { offerRevisionProducts, offerRevisions, offers, products } from "../database/schema";

// ── Types ──────────────────────────────────────────────────────────────────────

export type InsertOfferData = {
  name?: string;
  customerName: string | null;
  clientRequest: string;
  userId: string;
};

export type InsertRevisionData = {
  offerId: string;
  status: string;
  notes: string[];
  unmatched: string[];
  userId: string;
};

export type InsertRevisionProductData = {
  productId: string;
  requestItem: string;
  quantity: number;
  rationale: string;
};

export type OfferRow = {
  id: string;
  name: string;
  customerName: string | null;
  clientRequest: string | null;
  userId: string;
  createdAt: Date;
};

export type RevisionRow = {
  id: string;
  offerId: string;
  revisionNumber: number;
  status: string;
  notes: string[];
  unmatched: string[];
  userId: string;
  createdAt: Date;
};

export type RevisionProductRow = {
  productId: string;
  productName: string;
  productSku: string;
  productDescription: string;
  productManufacturer: string;
  requestItem: string;
  quantity: number;
  rationale: string;
};

export type FullRevisionRow = {
  offer: OfferRow;
  revision: RevisionRow;
  products: RevisionProductRow[];
};

export type OfferSummaryRow = {
  id: string;
  name: string;
  customerName: string | null;
  status: string;
  revisionNumber: number;
  createdAt: Date;
  updatedAt: Date;
};

export type RevisionSummaryRow = {
  id: string;
  revisionNumber: number;
  status: string;
  userId: string;
  createdAt: Date;
};

type Tx = typeof db | Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

// ── Repository ─────────────────────────────────────────────────────────────────

export async function insertOffer(data: InsertOfferData, tx: Tx = db): Promise<OfferRow> {
  const [offer] = await tx.insert(offers).values(data).returning();
  return offer;
}

export async function insertRevision(
  data: InsertRevisionData,
  revisionProducts: InsertRevisionProductData[],
  tx: Tx = db
): Promise<{ id: string; revisionNumber: number }> {
  const [{ maxRevision }] = await tx
    .select({ maxRevision: max(offerRevisions.revisionNumber) })
    .from(offerRevisions)
    .where(eq(offerRevisions.offerId, data.offerId));

  const revisionNumber = (maxRevision ?? 0) + 1;

  const [revision] = await tx
    .insert(offerRevisions)
    .values({ ...data, revisionNumber })
    .returning({ id: offerRevisions.id, revisionNumber: offerRevisions.revisionNumber });

  if (revisionProducts.length > 0) {
    await tx
      .insert(offerRevisionProducts)
      .values(revisionProducts.map((p) => ({ ...p, revisionId: revision.id })));
  }

  return revision;
}

async function fetchRevisionProducts(revisionId: string, tx: Tx): Promise<RevisionProductRow[]> {
  return tx
    .select({
      productId: offerRevisionProducts.productId,
      productName: products.name,
      productSku: products.sku,
      productDescription: products.description,
      productManufacturer: products.manufacturer,
      requestItem: offerRevisionProducts.requestItem,
      quantity: offerRevisionProducts.quantity,
      rationale: offerRevisionProducts.rationale
    })
    .from(offerRevisionProducts)
    .innerJoin(products, eq(products.id, offerRevisionProducts.productId))
    .where(eq(offerRevisionProducts.revisionId, revisionId));
}

export async function findLatestRevision(offerId: string, tx: Tx = db): Promise<FullRevisionRow | null> {
  const [revision] = await tx
    .select()
    .from(offerRevisions)
    .where(eq(offerRevisions.offerId, offerId))
    .orderBy(desc(offerRevisions.revisionNumber))
    .limit(1);

  if (!revision) return null;

  const [offer] = await tx.select().from(offers).where(eq(offers.id, offerId));
  const revProducts = await fetchRevisionProducts(revision.id, tx);

  return { offer, revision, products: revProducts };
}

export async function findRevisionById(
  revisionId: string,
  offerId: string,
  tx: Tx = db
): Promise<FullRevisionRow | null> {
  const [revision] = await tx
    .select()
    .from(offerRevisions)
    .where(and(eq(offerRevisions.id, revisionId), eq(offerRevisions.offerId, offerId)));

  if (!revision) return null;

  const [offer] = await tx.select().from(offers).where(eq(offers.id, offerId));
  const revProducts = await fetchRevisionProducts(revision.id, tx);

  return { offer, revision, products: revProducts };
}

export async function listRevisions(offerId: string): Promise<RevisionSummaryRow[]> {
  return db
    .select({
      id: offerRevisions.id,
      revisionNumber: offerRevisions.revisionNumber,
      status: offerRevisions.status,
      userId: offerRevisions.userId,
      createdAt: offerRevisions.createdAt
    })
    .from(offerRevisions)
    .where(eq(offerRevisions.offerId, offerId))
    .orderBy(desc(offerRevisions.revisionNumber));
}

export async function listOffers(): Promise<OfferSummaryRow[]> {
  return db
    .selectDistinctOn([offers.id], {
      id: offers.id,
      name: offers.name,
      customerName: offers.customerName,
      status: offerRevisions.status,
      revisionNumber: offerRevisions.revisionNumber,
      createdAt: offers.createdAt,
      updatedAt: offerRevisions.createdAt
    })
    .from(offers)
    .innerJoin(offerRevisions, eq(offerRevisions.offerId, offers.id))
    .orderBy(offers.id, desc(offerRevisions.revisionNumber));
}
