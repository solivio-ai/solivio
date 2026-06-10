import "server-only";

import { and, desc, eq, max, sql } from "drizzle-orm";

import type { OfferRevisionSnapshot } from "@solivio/domain";
import { db } from "@solivio/sdk/runtime";

import { offerRevisions, offers } from "../data/schema.ts";

type Tx = typeof db | Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

export type InsertRevisionData = {
  offerId: string;
  snapshot: OfferRevisionSnapshot;
  /** Set to a Date when this revision locks prices at acceptance time. */
  acceptedAt?: Date | null;
};

export type RevisionRow = {
  id: string;
  offerId: string;
  revisionNumber: number;
  snapshot: OfferRevisionSnapshot;
  name: string | null;
  createdAt: Date;
  acceptedAt: Date | null;
};

export async function insertRevision(data: InsertRevisionData, tx: Tx = db): Promise<RevisionRow> {
  const run = async (t: Tx): Promise<RevisionRow> => {
    // Lock the parent offer row so concurrent revision inserts for the same
    // offer are serialized. The second caller will block here until the first
    // transaction commits, guaranteeing it reads the updated MAX afterward.
    await t.select({ id: offers.id }).from(offers).where(eq(offers.id, data.offerId)).for("update");

    const [maxRow] = await t
      .select({ max: max(offerRevisions.revisionNumber) })
      .from(offerRevisions)
      .where(eq(offerRevisions.offerId, data.offerId));

    const [revision] = await t
      .insert(offerRevisions)
      .values({
        offerId: data.offerId,
        revisionNumber: (maxRow?.max ?? 0) + 1,
        snapshot: data.snapshot,
        acceptedAt: data.acceptedAt ?? null,
      })
      .returning();

    return {
      id: revision.id,
      offerId: revision.offerId,
      revisionNumber: revision.revisionNumber,
      snapshot: revision.snapshot,
      name: revision.snapshot.name,
      createdAt: revision.createdAt,
      acceptedAt: revision.acceptedAt,
    };
  };

  // FOR UPDATE only serializes if the lock is held across the read and write.
  // Open a transaction when the caller didn't provide one.
  return tx === db ? db.transaction((t) => run(t)) : run(tx);
}

export async function findRevisionsByOfferId(
  offerId: string,
  tx: Tx = db,
): Promise<Omit<RevisionRow, "snapshot">[]> {
  const rows = await tx
    .select({
      id: offerRevisions.id,
      offerId: offerRevisions.offerId,
      revisionNumber: offerRevisions.revisionNumber,
      name: sql<string>`${offerRevisions.snapshot}->>'name'`,
      createdAt: offerRevisions.createdAt,
      acceptedAt: offerRevisions.acceptedAt,
    })
    .from(offerRevisions)
    .where(eq(offerRevisions.offerId, offerId))
    .orderBy(desc(offerRevisions.revisionNumber));

  return rows;
}

export async function findRevisionById(
  revisionId: string,
  offerId: string,
  tx: Tx = db,
): Promise<RevisionRow | null> {
  const rows = await tx
    .select({
      id: offerRevisions.id,
      offerId: offerRevisions.offerId,
      revisionNumber: offerRevisions.revisionNumber,
      snapshot: offerRevisions.snapshot,
      name: sql<string>`${offerRevisions.snapshot}->>'name'`,
      createdAt: offerRevisions.createdAt,
      acceptedAt: offerRevisions.acceptedAt,
    })
    .from(offerRevisions)
    .where(and(eq(offerRevisions.id, revisionId), eq(offerRevisions.offerId, offerId)));

  if (rows.length === 0) return null;
  return rows[0];
}
