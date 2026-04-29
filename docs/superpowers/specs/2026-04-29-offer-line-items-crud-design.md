# Offer Line Items CRUD Design

**Date:** 2026-04-29  
**Status:** Approved

## Overview

Add DB-backed CRUD for products within an offer (offer line items): add a product, edit its quantity, remove it. Design intentionally prepares the service layer for future chatbot tool integration via Vercel AI SDK.

## Scope

- In scope: add/edit quantity/remove offer line items via REST API + service layer + chatbot tool definitions
- Out of scope: in-memory draft store migration to DB, chatbot UI/route implementation

## Data Layer

### Schema

No schema changes needed. `offerProducts` table already has `id`, `offerId`, `productId`, `quantity`, `rationale`, `requestItem`, `createdAt`.

### `OfferItemRow` type fix

Add `offerProductId: string` to `OfferItemRow` and expose it in the `findOfferById` query. Without it the frontend cannot reference a specific line item for edit/delete.

### Repository — new functions in `offerRepository.ts`

| Function | Signature | Notes |
|---|---|---|
| `insertOfferProduct` | `(data, tx?) → offerProduct` | Singular add; existing `insertOfferProducts` is bulk-only |
| `updateOfferProduct` | `(offerProductId, offerId, { quantity }, tx?) → void` | `offerId` scopes the update for safety |
| `deleteOfferProduct` | `(offerProductId, offerId, tx?) → void` | `offerId` scopes the delete for safety |

### Service — new functions in `offerService.ts`

| Function | Signature | Returns |
|---|---|---|
| `addProductToOffer` | `(offerId, productId, quantity, requestItem?) → CreatedOffer` | Verifies offer exists, inserts line item, returns updated offer |
| `updateOfferLineItem` | `(offerProductId, offerId, quantity) → CreatedOffer` | Updates quantity, returns updated offer |
| `removeOfferLineItem` | `(offerProductId, offerId) → void` | Deletes line item |

`rationale` defaults to `""` on manual add (AI-generated offers populate it; manual adds do not).

## API Routes

All routes: require auth (`requireAuth`), validate body with Zod, follow existing error contract (`errorResponseSchema`).

### `apps/solivio/src/app/api/offers/[offerId]/products/route.ts`

```
POST /api/offers/[offerId]/products
Body:    { productId: string, quantity: number, requestItem?: string }
Returns: 201 + { offer }   — full offer so UI can refresh in one shot
Errors:  400 validation, 404 offer not found
```

### `apps/solivio/src/app/api/offers/[offerId]/products/[offerProductId]/route.ts`

```
PATCH /api/offers/[offerId]/products/[offerProductId]
Body:    { quantity: number }
Returns: 200 + { offer }
Errors:  400 validation, 404 offer or line item not found

DELETE /api/offers/[offerId]/products/[offerProductId]
Returns: 204 No Content
Errors:  404 offer or line item not found
```

## Chatbot Tool Definitions

New file: `apps/solivio/src/server/offers/offerLineItemTools.ts`

Exports `offerLineItemTools` — an object of three Vercel AI SDK `tool()` definitions that call service functions directly (no HTTP round-trip). Each tool includes a descriptive `description` string so the LLM can choose the right one.

| Tool name | Params | Calls |
|---|---|---|
| `add_product_to_offer` | `offerId`, `productId`, `quantity`, `requestItem?` | `addProductToOffer` |
| `update_offer_line_item` | `offerId`, `offerProductId`, `quantity` | `updateOfferLineItem` |
| `remove_offer_line_item` | `offerId`, `offerProductId` | `removeOfferLineItem` |

Usage in a future chat route:

```ts
import { offerLineItemTools } from "@/server/offers/offerLineItemTools";

streamText({ model, messages, tools: { ...offerLineItemTools } });
```

## Error Handling

- Offer not found → 404
- Line item not found (wrong `offerProductId` or belongs to different offer) → 404
- Invalid body → 400 with Zod issues
- DB errors propagate as 500 (handled by Next.js default error boundary)

## Files Touched

| File | Change |
|---|---|
| `server/database/schema.ts` | No change |
| `server/offers/offerRepository.ts` | Add `offerProductId` to `OfferItemRow`; add `insertOfferProduct`, `updateOfferProduct`, `deleteOfferProduct` |
| `server/offers/offerService.ts` | Add `addProductToOffer`, `updateOfferLineItem`, `removeOfferLineItem` |
| `app/api/offers/[offerId]/products/route.ts` | New — POST handler |
| `app/api/offers/[offerId]/products/[offerProductId]/route.ts` | New — PATCH + DELETE handlers |
| `server/offers/offerLineItemTools.ts` | New — Vercel AI SDK tool definitions |
