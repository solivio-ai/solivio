import "server-only";

import { eq } from "drizzle-orm";

import type { OfferRevision, OfferRevisionSnapshot } from "@solivio/domain";

import { db } from "../database/db";
import { offerItems, offers } from "../database/schema";
import type { InsertOfferItemData } from "./offerRepository";
import { findOfferById, insertOfferItems, lockOfferForUpdate, touchOffer } from "./offerRepository";
import type { RevisionRow } from "./offerRevisionRepository";
import {
  findRevisionById,
  findRevisionsByOfferId,
  insertRevision,
} from "./offerRevisionRepository";

type Tx = typeof db | Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

function rowToRevision(
  row: Omit<RevisionRow, "snapshot"> & { snapshot?: OfferRevisionSnapshot },
): OfferRevision {
  return {
    id: row.id,
    offerId: row.offerId,
    revisionNumber: row.revisionNumber,
    snapshot: row.snapshot,
    createdBy: null,
    createdAt: row.createdAt.toISOString(),
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
  };
}

export async function saveRevision(
  offerId: string,
  userId: string | null,
  acceptedAt?: Date | null,
  tx: Tx = db,
): Promise<OfferRevision | null> {
  const row = await findOfferById(offerId, tx);
  if (!row) return null;

  const snapshot: OfferRevisionSnapshot = {
    name: row.name,
    customerId: row.customerId,
    customerName: row.customerName,
    requestId: row.requestId,
    clientRequest: row.clientRequest,
    status: row.status,
    currency: row.currency,
    discountPercent: row.discountPercent,
    discountAmount: row.discountAmount,
    notes: row.notes,
    unmatched: row.unmatched,
    items: row.items.map((item, index) => ({
      productId: item.productId,
      sku: item.productSku,
      name: item.name,
      description: item.description,
      requestItem: item.requestItem,
      quantity: item.quantity,
      unitPriceNet: item.unitPriceNet,
      vatRate: item.vatRate,
      unitGrossPrice: item.unitGrossPrice,
      totalNet: item.totalNet,
      totalGross: item.totalGross,
      rationale: item.rationale,
      matchSource: item.matchSource,
      matchScore: item.matchScore,
      position: index,
    })),
  };

  const revision = await insertRevision({ offerId, snapshot, acceptedAt }, tx);
  await touchOffer(offerId, userId, tx);

  return rowToRevision(revision);
}

export async function listRevisions(offerId: string): Promise<OfferRevision[]> {
  const rows = await findRevisionsByOfferId(offerId);
  return rows.map(rowToRevision);
}

export async function getRevision(
  offerId: string,
  revisionId: string,
): Promise<OfferRevision | null> {
  const row = await findRevisionById(revisionId, offerId);
  if (!row) return null;
  return rowToRevision(row);
}

export async function restoreRevision(
  offerId: string,
  revisionId: string,
  userId: string | null,
): Promise<OfferRevision | null> {
  const revisionRow = await findRevisionById(revisionId, offerId);
  if (!revisionRow) return null;

  const { snapshot } = revisionRow;

  let blocked = false;
  await db.transaction(async (tx) => {
    const locked = await lockOfferForUpdate(offerId, tx);
    if (!locked || locked.status === "accepted" || locked.status === "imported") {
      blocked = true;
      return;
    }

    await tx.delete(offerItems).where(eq(offerItems.offerId, offerId));

    if (snapshot.items.length > 0) {
      const items: InsertOfferItemData[] = snapshot.items.map((item) => ({
        offerId,
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
      }));
      await insertOfferItems(items, tx);
    }

    await tx
      .update(offers)
      .set({
        name: snapshot.name,
        customerId: snapshot.customerId,
        requestId: snapshot.requestId,
        currency: snapshot.currency,
        notes: snapshot.notes,
        unmatched: snapshot.unmatched,
        discountPercent: snapshot.discountPercent ?? 0,
        discountAmount: snapshot.discountAmount ?? 0,
        status: "draft",
        userId,
        updatedAt: new Date(),
      })
      .where(eq(offers.id, offerId));

    await saveRevision(offerId, userId, null, tx);
  });

  if (blocked) return null;

  const revisions = await findRevisionsByOfferId(offerId);
  return revisions.length > 0 ? rowToRevision(revisions[0]) : null;
}
