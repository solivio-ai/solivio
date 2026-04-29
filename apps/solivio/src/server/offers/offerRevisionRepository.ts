import "server-only";

import { and, desc, eq, max, sql } from "drizzle-orm";

import { db } from "../database/db";
import { offerRevisions, user } from "../database/schema";
import type { OfferRevisionSnapshot } from "@solivio/domain";

type Tx = typeof db | Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

export type InsertRevisionData = {
  offerId: string;
  snapshot: OfferRevisionSnapshot;
  createdBy: string | null;
  /** Set to a Date when this revision locks prices at acceptance time. */
  acceptedAt?: Date | null;
};

export type RevisionRow = {
  id: string;
  offerId: string;
  revisionNumber: number;
  snapshot: OfferRevisionSnapshot;
  name: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: Date;
  acceptedAt: Date | null;
};

export async function insertRevision(
  data: InsertRevisionData,
  tx: Tx = db
): Promise<RevisionRow> {
  const [maxRow] = await tx
    .select({ max: max(offerRevisions.revisionNumber) })
    .from(offerRevisions)
    .where(eq(offerRevisions.offerId, data.offerId));

  const nextNumber = (maxRow?.max ?? 0) + 1;

  const [revision] = await tx
    .insert(offerRevisions)
    .values({
      offerId: data.offerId,
      revisionNumber: nextNumber,
      snapshot: data.snapshot,
      createdBy: data.createdBy,
      acceptedAt: data.acceptedAt ?? null,
    })
    .returning();

  return {
    id: revision.id,
    offerId: revision.offerId,
    revisionNumber: revision.revisionNumber,
    snapshot: revision.snapshot,
    name: revision.snapshot.name,
    createdById: revision.createdBy,
    createdByName: null,
    createdAt: revision.createdAt,
    acceptedAt: revision.acceptedAt,
  };
}

export async function findRevisionsByOfferId(
  offerId: string,
  tx: Tx = db
): Promise<Omit<RevisionRow, "snapshot">[]> {
  const rows = await tx
    .select({
      id: offerRevisions.id,
      offerId: offerRevisions.offerId,
      revisionNumber: offerRevisions.revisionNumber,
      name: sql<string>`${offerRevisions.snapshot}->>'name'`,
      createdById: offerRevisions.createdBy,
      createdByName: user.name,
      createdAt: offerRevisions.createdAt,
      acceptedAt: offerRevisions.acceptedAt,
    })
    .from(offerRevisions)
    .leftJoin(user, eq(user.id, offerRevisions.createdBy))
    .where(eq(offerRevisions.offerId, offerId))
    .orderBy(desc(offerRevisions.revisionNumber));

  return rows.map((row) => ({
    id: row.id,
    offerId: row.offerId,
    revisionNumber: row.revisionNumber,
    name: row.name,
    createdById: row.createdById,
    createdByName: row.createdByName,
    createdAt: row.createdAt,
    acceptedAt: row.acceptedAt,
  }));
}

export async function findRevisionById(
  revisionId: string,
  offerId: string,
  tx: Tx = db
): Promise<RevisionRow | null> {
  const rows = await tx
    .select({
      id: offerRevisions.id,
      offerId: offerRevisions.offerId,
      revisionNumber: offerRevisions.revisionNumber,
      snapshot: offerRevisions.snapshot,
      name: sql<string>`${offerRevisions.snapshot}->>'name'`,
      createdById: offerRevisions.createdBy,
      createdByName: user.name,
      createdAt: offerRevisions.createdAt,
      acceptedAt: offerRevisions.acceptedAt,
    })
    .from(offerRevisions)
    .leftJoin(user, eq(user.id, offerRevisions.createdBy))
    .where(
      and(
        eq(offerRevisions.id, revisionId),
        eq(offerRevisions.offerId, offerId)
      )
    );

  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    id: row.id,
    offerId: row.offerId,
    revisionNumber: row.revisionNumber,
    snapshot: row.snapshot,
    name: row.name,
    createdById: row.createdById,
    createdByName: row.createdByName,
    createdAt: row.createdAt,
    acceptedAt: row.acceptedAt,
  };
}
