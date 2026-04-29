import "server-only";

import { eq } from "drizzle-orm";

import { db } from "../database/db";
import { offerProducts, offers } from "../database/schema";
import type { OfferRevision, OfferRevisionSnapshot } from "@solivio/domain";
import {
  findRevisionById,
  findRevisionsByOfferId,
  insertRevision,
} from "./offerRevisionRepository";
import {
  findOfferById,
  insertOfferProducts,
  setOfferUpdatedBy,
} from "./offerRepository";

function rowToRevision(row: {
  id: string;
  offerId: string;
  revisionNumber: number;
  createdById: string | null;
  createdByName: string | null;
  createdAt: Date;
  acceptedAt?: Date | null;
  snapshot?: OfferRevisionSnapshot;
} & ({ snapshot: OfferRevisionSnapshot } | { snapshot?: never })): OfferRevision {
  return {
    id: row.id,
    offerId: row.offerId,
    revisionNumber: row.revisionNumber,
    snapshot: row.snapshot,
    createdBy: row.createdById
      ? { id: row.createdById, name: row.createdByName ?? "" }
      : null,
    createdAt: row.createdAt.toISOString(),
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
  };
}

export async function saveRevision(
  offerId: string,
  userId: string | null,
  acceptedAt?: Date | null
): Promise<OfferRevision | null> {
  const row = await findOfferById(offerId);
  if (!row) return null;

  const snapshot: OfferRevisionSnapshot = {
    name: row.name,
    customerName: row.customerName,
    clientRequest: row.clientRequest,
    status: row.status,
    notes: row.notes,
    unmatched: row.unmatched,
    lineItems: row.items.map((item, index) => ({
      productId: item.productId,
      sku: item.productSku,
      name: item.productName,
      requestItem: item.requestItem,
      quantity: item.quantity,
      unitPriceNet: item.unitPriceNet,
      currency: item.currency,
      rationale: item.rationale,
      position: index,
    })),
  };

  const revision = await insertRevision({ offerId, snapshot, createdBy: userId, acceptedAt });
  await setOfferUpdatedBy(offerId, userId);

  return rowToRevision(revision);
}

export async function listRevisions(offerId: string): Promise<OfferRevision[]> {
  const rows = await findRevisionsByOfferId(offerId);
  return rows.map(rowToRevision);
}

export async function getRevision(
  offerId: string,
  revisionId: string
): Promise<OfferRevision | null> {
  const row = await findRevisionById(revisionId, offerId);
  if (!row) return null;
  return rowToRevision(row);
}

export async function restoreRevision(
  offerId: string,
  revisionId: string,
  userId: string | null
): Promise<OfferRevision | null> {
  const revisionRow = await findRevisionById(revisionId, offerId);
  if (!revisionRow) return null;

  const { snapshot } = revisionRow;

  // Check if current offer is locked
  const currentOffer = await findOfferById(offerId);
  if (currentOffer?.status === "accepted") {
    return null;
  }

  await db.transaction(async (tx) => {
    await tx.delete(offerProducts).where(eq(offerProducts.offerId, offerId));

    if (snapshot.lineItems.length > 0) {
      await insertOfferProducts(
        snapshot.lineItems.map((item) => ({
          offerId,
          productId: item.productId,
          requestItem: item.requestItem,
          quantity: item.quantity,
          unitPriceNet: item.unitPriceNet,
          currency: item.currency,
          rationale: item.rationale,
          position: item.position,
        })),
        tx
      );
    }

    await tx
      .update(offers)
      .set({
        name: snapshot.name,
        customerName: snapshot.customerName,
        clientRequest: snapshot.clientRequest,
        notes: snapshot.notes,
        unmatched: snapshot.unmatched,
        status: "draft",
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(offers.id, offerId));
  });

  // The restore action itself becomes a new revision
  await saveRevision(offerId, userId);

  const revisions = await findRevisionsByOfferId(offerId);
  return revisions.length > 0 ? rowToRevision(revisions[0]) : null;
}
