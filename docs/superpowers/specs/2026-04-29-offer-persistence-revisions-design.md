# Offer Persistence & Revision History Design

**Date:** 2026-04-29  
**Status:** Approved

## Overview

Replace the in-memory `offerDraftStore` with full DB persistence. Every mutation (add/remove/update product, status change) creates an immutable revision. Users can view any past revision, restore it, and continue editing from that point.

## Scope

**In scope:**
- DB persistence for all offer mutations (replace `offerDraftStore`)
- Append-only revision history: every mutation creates a new revision
- Restore a past revision (creates a new revision from the snapshot)
- `userId` attribution on offers and revisions
- `GET /api/offers` returns all offers (not filtered by user)
- Integration with `product-crud` branch (offerProductId → productId, schema rework)

**Out of scope:**
- Revision pruning / retention limits (keep all revisions)
- Offer ownership/access control (all authenticated users see all offers)
- Offer naming beyond the existing `name` default

## Architecture: Revisions as Single Source of Truth

Revisions are the source of truth. There is no separate "current state" table — the current offer state is always the latest revision. Mutations are read-modify-write transactions: read the latest revision, apply the change in memory, insert a new revision row with the full product snapshot.

This eliminates the dual-write consistency risk and makes it structurally impossible to mutate an offer without creating a revision.

## Schema

### `offers` table — modified

Remove `status`, `notes`, `unmatched`, `updatedAt` (these belong to each revision). Add `userId`.

```ts
export const offers = pgTable("offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().default("Draft"),
  customerName: text("customer_name"),
  clientRequest: text("client_request"),
  userId: text("user_id").notNull().references(() => user.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

### `offer_revisions` — new table

One row per revision. Holds the offer state at that point in time.

```ts
export const offerRevisions = pgTable(
  "offer_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    offerId: uuid("offer_id").notNull().references(() => offers.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    status: text("status").notNull().default("draft"),
    notes: text("notes").array().notNull().default([]),
    unmatched: text("unmatched").array().notNull().default([]),
    userId: text("user_id").notNull().references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("offer_revisions_offer_revision_uidx").on(table.offerId, table.revisionNumber),
    index("offer_revisions_offer_id_idx").on(table.offerId),
  ]
);
```

### `offer_revision_products` — new table

Full product snapshot for each revision. Replaces `offerProducts`.

```ts
export const offerRevisionProducts = pgTable("offer_revision_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  revisionId: uuid("revision_id").notNull().references(() => offerRevisions.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id),
  requestItem: text("request_item").notNull().default(""),
  quantity: integer("quantity").notNull(),
  rationale: text("rationale").notNull().default(""),
});
```

### `offer_products` — dropped

`offerProducts` is removed. All product state lives in `offer_revision_products`.

## Repository

**File:** `apps/solivio/src/server/offers/offerRepository.ts` — full rewrite.

| Function | Description |
|---|---|
| `insertOffer(data, tx?)` | Insert `offers` row (without status/notes/unmatched) |
| `insertRevision(data, products[], tx?)` | Insert `offer_revisions` + all `offer_revision_products` in one call; returns the new revision with products |
| `findLatestRevision(offerId, tx?)` | Fetch the latest revision + its products for an offer |
| `findRevisionById(revisionId, tx?)` | Fetch a specific revision + its products |
| `listRevisions(offerId)` | Return all revisions (metadata only, no products) ordered `revisionNumber DESC` |
| `listOffers()` | Return all offers with their latest revision status + `revisionNumber` |

## Service

**File:** `apps/solivio/src/server/offers/offerService.ts` — significant rewrite.

All mutations follow the same pattern inside a DB transaction:
1. `findLatestRevision` — get current state
2. Apply change in memory
3. `insertRevision` with `revisionNumber = latest.revisionNumber + 1`

| Function | Signature | Notes |
|---|---|---|
| `createOffer` | `(customerName, clientRequest, generated, userId) → CreatedOffer` | Creates `offers` row + revision 1 in one transaction. Removes `saveOfferDraft` call. |
| `getOffer` | `(offerId) → Offer \| null` | Reads latest revision |
| `listOffers` | `() → OfferSummary[]` | All offers, latest revision metadata |
| `getOfferRevision` | `(offerId, revisionId) → Offer \| null` | Reads specific revision |
| `listOfferRevisions` | `(offerId) → RevisionSummary[]` | All revisions for an offer |
| `updateOfferStatus` | `(offerId, status, userId) → CreatedOffer \| null` | Read-modify-write: change status, new revision |
| `addProductToOffer` | `(offerId, productId, quantity, requestItem, userId) → CreatedOffer \| null \| "duplicate"` | Read-modify-write: add product, new revision |
| `updateOfferLineItem` | `(offerId, productId, quantity, userId) → CreatedOffer \| null` | Read-modify-write: update quantity, new revision. Keyed by `productId`. |
| `removeOfferLineItem` | `(offerId, productId, userId) → boolean` | Read-modify-write: remove product, new revision. Keyed by `productId`. |
| `restoreRevision` | `(offerId, revisionId, userId) → CreatedOffer \| null` | Reads target revision, creates new revision with its full state |

`offerDraftStore.ts` is deleted entirely.

## Domain & API Contract Changes

### Domain `Offer` type (`packages/domain/src/index.ts`)

- Add `revisionId: string` and `revisionNumber: number` (required)
- Remove `offerProductId` from `OfferItem` — `productId` is the stable identifier

### `offerSchema` in `contracts.ts`

- Add `revisionId: z.string()` and `revisionNumber: z.number().int().positive()`
- Remove `offerProductId` from `offerItemSchema`

### New schemas in `contracts.ts`

```ts
// Revision summary (no products)
revisionSummarySchema: { revisionId, revisionNumber, status, createdAt, userId }

// List of offers
offerSummarySchema: { id, name, customerName, status, revisionNumber, createdAt }
```

## API Routes

### Changed routes

| Method | Path | Change |
|---|---|---|
| `GET` | `/api/offers` | Returns `OfferSummary[]` (all offers, latest revision) instead of demo offer |
| `POST` | `/api/offers` | Passes `userId` from auth session to `createOffer` |
| `GET` | `/api/offers/[offerId]` | Reads from DB (latest revision); no demo offer special-casing |
| `PATCH` | `/api/offers/[offerId]` | Calls `updateOfferStatus` instead of `updateOfferDraft`; accepts `{ status }` only |
| `POST` | `/api/offers/[offerId]/products` | Passes `userId` from session |
| `PATCH` | `/api/offers/[offerId]/products/[productId]` | Renamed from `[offerProductId]`; `userId` added |
| `DELETE` | `/api/offers/[offerId]/products/[productId]` | Renamed from `[offerProductId]`; `userId` added |

### New routes

| Method | Path | Response |
|---|---|---|
| `GET` | `/api/offers/[offerId]/revisions` | `200` + `{ revisions: RevisionSummary[] }` |
| `GET` | `/api/offers/[offerId]/revisions/[revisionId]` | `200` + `{ offer: Offer }` (full snapshot) or `404` |
| `POST` | `/api/offers/[offerId]/revisions/[revisionId]/restore` | `201` + `{ offer: Offer }` (new revision = restored copy) or `404` |

All routes require auth. All error responses use `errorResponseSchema`.

## Integration with `product-crud` Branch

The `product-crud` branch must be updated before or as part of this implementation:

- Remove `offerProductId` from all layers (domain, contracts, repository types, service types, `toOfferDomain`)
- Rename route files `[offerProductId]/` → `[productId]/`
- Replace `insertOfferProduct`, `updateOfferProduct`, `deleteOfferProduct` repository functions with the new `insertRevision`-based pattern
- Update `offerLineItemTools.ts`: parameter `offerProductId` → `productId`
- `userId` added as parameter to all three line item service functions

**Implementation order:** implement this persistence/revision spec first. Then apply `product-crud` on top, updating it to match the new architecture.

## Demo Offer

The `demoOffer` constant from `@solivio/domain` is used by the `/offers/demo` page. That page imports `demoOffer` directly (not via the API), so it continues to work unchanged. The special-casing `offerId === demoOffer.id ? demoOffer : await getOffer(offerId)` is removed from `GET /api/offers/[offerId]` — requests to the demo offer ID via the API return 404 like any unknown offer.

## Error Handling

- Offer not found → `404`
- Revision not found → `404`
- Invalid body → `400` with Zod issues
- DB errors → `500` (Next.js default)

## Files Touched

| Action | File |
|---|---|
| Modify | `apps/solivio/src/server/database/schema.ts` |
| Rewrite | `apps/solivio/src/server/offers/offerRepository.ts` |
| Rewrite | `apps/solivio/src/server/offers/offerService.ts` |
| Delete | `apps/solivio/src/server/offers/offerDraftStore.ts` |
| Modify | `apps/solivio/src/server/api/contracts.ts` |
| Modify | `packages/domain/src/index.ts` |
| Modify | `apps/solivio/src/app/api/offers/route.ts` |
| Modify | `apps/solivio/src/app/api/offers/[offerId]/route.ts` |
| Modify | `apps/solivio/src/app/api/offers/[offerId]/products/route.ts` |
| Rename+modify | `apps/solivio/src/app/api/offers/[offerId]/products/[offerProductId]/route.ts` → `[productId]/route.ts` |
| Create | `apps/solivio/src/app/api/offers/[offerId]/revisions/route.ts` |
| Create | `apps/solivio/src/app/api/offers/[offerId]/revisions/[revisionId]/route.ts` |
| Create | `apps/solivio/src/app/api/offers/[offerId]/revisions/[revisionId]/restore/route.ts` |
