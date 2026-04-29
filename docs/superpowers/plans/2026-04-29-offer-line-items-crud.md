# Offer Line Items CRUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add DB-backed CRUD (add product / edit quantity / remove) for offer line items and expose the same operations as Vercel AI SDK tool definitions for future chatbot integration.

**Architecture:** Follow the existing repository → service → API route pattern. The `offerProducts.id` (line item ID) is surfaced through every layer so clients can reference individual items for PATCH/DELETE. Three new REST endpoints handle mutations; `offerLineItemTools.ts` wraps the same service functions as Vercel AI SDK `tool()` definitions with no extra infrastructure.

**Tech Stack:** Drizzle ORM, PostgreSQL, Next.js API routes, Zod v4, Vercel AI SDK (`ai` package), TypeScript.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `packages/domain/src/index.ts` | Add optional `offerProductId` to `OfferItem` |
| Modify | `apps/solivio/src/server/api/contracts.ts` | Add `offerProductId` to `offerItemSchema`; add `addOfferProductRequestSchema`, `updateOfferLineItemRequestSchema` |
| Modify | `apps/solivio/src/server/offers/offerRepository.ts` | Add `offerProductId` to `OfferItemRow`; add `insertOfferProduct`, `updateOfferProduct`, `deleteOfferProduct` |
| Modify | `apps/solivio/src/server/offers/offerService.ts` | Add `offerProductId` to `OfferLineItem`; add `addProductToOffer`, `updateOfferLineItem`, `removeOfferLineItem`; update `toOfferDomain` |
| Create | `apps/solivio/src/app/api/offers/[offerId]/products/route.ts` | POST — add product to offer |
| Create | `apps/solivio/src/app/api/offers/[offerId]/products/[offerProductId]/route.ts` | PATCH + DELETE — update quantity / remove |
| Create | `apps/solivio/src/server/offers/offerLineItemTools.ts` | Vercel AI SDK tool definitions |

---

### Task 1: Expose offerProductId through the data layer

The `offerProducts` table already has an `id` UUID column but it is never selected or surfaced. The frontend needs it to make PATCH/DELETE requests to a specific line item.

**Files:**
- Modify: `packages/domain/src/index.ts`
- Modify: `apps/solivio/src/server/api/contracts.ts`
- Modify: `apps/solivio/src/server/offers/offerRepository.ts`
- Modify: `apps/solivio/src/server/offers/offerService.ts`

- [ ] **Step 1: Add `offerProductId` to the domain `OfferItem` type**

In `packages/domain/src/index.ts`, update `OfferItem` (currently at line 37):

```ts
export type OfferItem = {
  offerProductId?: string;  // ← add (optional: demo offers have no DB-backed line item ID)
  productId: string;
  quantity: number;
  rationale: string;
  confidence?: number;
  unitPriceNet?: number;
  currency?: Product["currency"];
  product?: {
    id: string;
    sku?: string;
    name: string;
    description?: string;
    manufacturer?: string;
    availability?: Product["availability"];
    priceNet?: number;
    currency?: Product["currency"];
    matchScore?: number;
    source: "demo" | "database" | "semantic-search";
  };
};
```

- [ ] **Step 2: Add `offerProductId` to `offerItemSchema` in contracts**

In `apps/solivio/src/server/api/contracts.ts`, update `offerItemSchema` to add the optional field as the first property:

```ts
export const offerItemSchema = z
  .object({
    offerProductId: z.string().optional(),  // ← add (optional: demo offers omit this)
    productId: z.string(),
    productName: z.string().optional(),
    productSku: z.string().optional(),
    quantity: z.number().int().positive(),
    rationale: z.string(),
    confidence: z.number().min(0).max(100).optional(),
    unitPriceNet: z.number().nonnegative().optional(),
    currency: currencySchema.optional(),
    product: offerItemProductSchema.optional()
  })
  .meta({
    id: "OfferItem",
    description: "A product line item included in an offer."
  });
```

- [ ] **Step 3: Add `offerProductId` to `OfferItemRow` in repository**

In `apps/solivio/src/server/offers/offerRepository.ts`, update `OfferItemRow`:

```ts
export type OfferItemRow = {
  offerProductId: string;  // ← add
  productId: string;
  productName: string;
  productSku: string;
  productDescription: string;
  productManufacturer: string;
  requestItem: string;
  quantity: number;
  rationale: string;
};
```

- [ ] **Step 4: Select `offerProducts.id` in `findOfferById`**

In the same file, add `offerProductId: offerProducts.id` to the `.select()` call inside `findOfferById`:

```ts
const rows = await tx
  .select({
    offerId: offers.id,
    customerName: offers.customerName,
    clientRequest: offers.clientRequest,
    status: offers.status,
    createdAt: offers.createdAt,
    notes: offers.notes,
    unmatched: offers.unmatched,
    offerProductId: offerProducts.id,        // ← add
    productId: offerProducts.productId,
    productName: products.name,
    productSku: products.sku,
    productDescription: products.description,
    productManufacturer: products.manufacturer,
    requestItem: offerProducts.requestItem,
    quantity: offerProducts.quantity,
    rationale: offerProducts.rationale
  })
```

And update the items mapping at the bottom of `findOfferById`:

```ts
items: rows
  .filter((row) => row.productId !== null)
  .map((row) => ({
    offerProductId: row.offerProductId!,  // ← add
    productId: row.productId!,
    productName: row.productName!,
    productSku: row.productSku!,
    productDescription: row.productDescription!,
    productManufacturer: row.productManufacturer!,
    requestItem: row.requestItem!,
    quantity: row.quantity!,
    rationale: row.rationale!
  }))
```

- [ ] **Step 5: Add `offerProductId` to `OfferLineItem` in service**

In `apps/solivio/src/server/offers/offerService.ts`, update `OfferLineItem`:

```ts
export type OfferLineItem = {
  offerProductId: string;  // ← add
  productId: string;
  productName: string;
  productSku: string;
  productDescription: string;
  productManufacturer: string;
  requestItem: string;
  quantity: number;
  rationale: string;
};
```

`rowToCreatedOffer` passes `row.items` directly as `items`; since `OfferItemRow` and `OfferLineItem` are now structurally identical, no change is needed there.

- [ ] **Step 6: Include `offerProductId` in `toOfferDomain`**

In `offerService.ts`, update the items mapping inside `toOfferDomain`:

```ts
items: offer.items.map((item) => ({
  offerProductId: item.offerProductId,  // ← add
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
```

- [ ] **Step 7: Verify type-checking passes**

```bash
cd /Users/vlad/projects/solivio/apps/solivio && yarn typecheck
```

Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add packages/domain/src/index.ts \
        apps/solivio/src/server/api/contracts.ts \
        apps/solivio/src/server/offers/offerRepository.ts \
        apps/solivio/src/server/offers/offerService.ts
git commit -m "feat: expose offerProductId through repository, service, and API schema"
```

---

### Task 2: Add line item CRUD to repository and service

**Files:**
- Modify: `apps/solivio/src/server/offers/offerRepository.ts`
- Modify: `apps/solivio/src/server/offers/offerService.ts`

- [ ] **Step 1: Add `and` to drizzle-orm import in repository**

In `apps/solivio/src/server/offers/offerRepository.ts`, update the top import:

```ts
import { and, eq } from "drizzle-orm";
```

- [ ] **Step 2: Add `insertOfferProduct` to repository**

Add after the existing `insertOfferProducts` function:

```ts
export async function insertOfferProduct(data: InsertOfferProductData, tx: Tx = db) {
  const [item] = await tx
    .insert(offerProducts)
    .values(data)
    .returning({ id: offerProducts.id });
  return item;
}
```

- [ ] **Step 3: Add `updateOfferProduct` to repository**

Add after `insertOfferProduct`:

```ts
export async function updateOfferProduct(
  offerProductId: string,
  offerId: string,
  data: { quantity: number },
  tx: Tx = db
) {
  await tx
    .update(offerProducts)
    .set({ quantity: data.quantity })
    .where(and(eq(offerProducts.id, offerProductId), eq(offerProducts.offerId, offerId)));
}
```

- [ ] **Step 4: Add `deleteOfferProduct` to repository**

Add after `updateOfferProduct`:

```ts
export async function deleteOfferProduct(
  offerProductId: string,
  offerId: string,
  tx: Tx = db
) {
  await tx
    .delete(offerProducts)
    .where(and(eq(offerProducts.id, offerProductId), eq(offerProducts.offerId, offerId)));
}
```

- [ ] **Step 5: Update repository import in service**

In `apps/solivio/src/server/offers/offerService.ts`, update the import from `./offerRepository` to include the three new functions:

```ts
import {
  findOfferById,
  insertOffer,
  insertOfferProducts,
  insertOfferProduct,
  updateOfferProduct,
  deleteOfferProduct,
  type OfferRow
} from "./offerRepository";
```

- [ ] **Step 6: Add `addProductToOffer` to service**

Add after the existing `getOffer` function:

```ts
export async function addProductToOffer(
  offerId: string,
  productId: string,
  quantity: number,
  requestItem = ""
): Promise<CreatedOffer | null> {
  const existing = await findOfferById(offerId);
  if (!existing) return null;
  await insertOfferProduct({ offerId, productId, requestItem, quantity, rationale: "" });
  const row = await findOfferById(offerId);
  return rowToCreatedOffer(row!);
}
```

- [ ] **Step 7: Add `updateOfferLineItem` to service**

Add after `addProductToOffer`:

```ts
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
```

- [ ] **Step 8: Add `removeOfferLineItem` to service**

Add after `updateOfferLineItem`:

```ts
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
```

- [ ] **Step 9: Verify type-checking passes**

```bash
cd /Users/vlad/projects/solivio/apps/solivio && yarn typecheck
```

Expected: no errors

- [ ] **Step 10: Commit**

```bash
git add apps/solivio/src/server/offers/offerRepository.ts \
        apps/solivio/src/server/offers/offerService.ts
git commit -m "feat: add offer line item CRUD to repository and service"
```

---

### Task 3: Add request schemas to contracts

**Files:**
- Modify: `apps/solivio/src/server/api/contracts.ts`

- [ ] **Step 1: Add `addOfferProductRequestSchema`**

In `apps/solivio/src/server/api/contracts.ts`, add after `createOfferRequestSchema`:

```ts
export const addOfferProductRequestSchema = z
  .object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    requestItem: z.string().optional()
  })
  .strict()
  .meta({
    id: "AddOfferProductRequest",
    description: "Product and quantity to add as a line item to an offer."
  });
```

- [ ] **Step 2: Add `updateOfferLineItemRequestSchema`**

Add after `addOfferProductRequestSchema`:

```ts
export const updateOfferLineItemRequestSchema = z
  .object({
    quantity: z.number().int().positive()
  })
  .strict()
  .meta({
    id: "UpdateOfferLineItemRequest",
    description: "New quantity for an existing offer line item."
  });
```

- [ ] **Step 3: Verify type-checking passes**

```bash
cd /Users/vlad/projects/solivio/apps/solivio && yarn typecheck
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/solivio/src/server/api/contracts.ts
git commit -m "feat: add offer line item request schemas to contracts"
```

---

### Task 4: Create POST /api/offers/[offerId]/products route

**Files:**
- Create: `apps/solivio/src/app/api/offers/[offerId]/products/route.ts`

- [ ] **Step 1: Create the route file**

Create `apps/solivio/src/app/api/offers/[offerId]/products/route.ts`:

```ts
import { NextResponse } from "next/server";

import {
  addOfferProductRequestSchema,
  errorResponseSchema,
  offerResponseSchema
} from "@/server/api/contracts";
import { requireAuth } from "@/server/auth/session";
import { addProductToOffer, toOfferDomain } from "@/server/offers/offerService";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ offerId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  const { offerId } = await context.params;
  const parsed = addOfferProductRequestSchema.safeParse(
    await request.json().catch(() => ({}))
  );

  if (!parsed.success) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "invalid_request",
          message: "Request body is invalid.",
          issues: parsed.error.issues.map((i) => i.message)
        }
      }),
      { status: 400 }
    );
  }

  const { productId, quantity, requestItem } = parsed.data;
  const offer = await addProductToOffer(offerId, productId, quantity, requestItem);

  if (!offer) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "offer_not_found",
          message: `Offer '${offerId}' was not found.`
        }
      }),
      { status: 404 }
    );
  }

  return NextResponse.json(
    offerResponseSchema.parse({ offer: toOfferDomain(offer) }),
    { status: 201 }
  );
}
```

- [ ] **Step 2: Verify type-checking passes**

```bash
cd /Users/vlad/projects/solivio/apps/solivio && yarn typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add "apps/solivio/src/app/api/offers/[offerId]/products/route.ts"
git commit -m "feat: add POST /api/offers/[offerId]/products route"
```

---

### Task 5: Create PATCH + DELETE /api/offers/[offerId]/products/[offerProductId] route

**Files:**
- Create: `apps/solivio/src/app/api/offers/[offerId]/products/[offerProductId]/route.ts`

- [ ] **Step 1: Create the route file**

Create `apps/solivio/src/app/api/offers/[offerId]/products/[offerProductId]/route.ts`:

```ts
import { NextResponse } from "next/server";

import {
  errorResponseSchema,
  offerResponseSchema,
  updateOfferLineItemRequestSchema
} from "@/server/api/contracts";
import { requireAuth } from "@/server/auth/session";
import {
  removeOfferLineItem,
  toOfferDomain,
  updateOfferLineItem
} from "@/server/offers/offerService";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ offerId: string; offerProductId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  const { offerId, offerProductId } = await context.params;
  const parsed = updateOfferLineItemRequestSchema.safeParse(
    await request.json().catch(() => ({}))
  );

  if (!parsed.success) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "invalid_request",
          message: "Request body is invalid.",
          issues: parsed.error.issues.map((i) => i.message)
        }
      }),
      { status: 400 }
    );
  }

  const offer = await updateOfferLineItem(offerProductId, offerId, parsed.data.quantity);

  if (!offer) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "not_found",
          message: "Offer or line item was not found."
        }
      }),
      { status: 404 }
    );
  }

  return NextResponse.json(offerResponseSchema.parse({ offer: toOfferDomain(offer) }));
}

export async function DELETE(_request: Request, context: RouteContext) {
  const unauthorized = await requireAuth();
  if (unauthorized) return unauthorized;

  const { offerId, offerProductId } = await context.params;
  const removed = await removeOfferLineItem(offerProductId, offerId);

  if (!removed) {
    return NextResponse.json(
      errorResponseSchema.parse({
        error: {
          code: "not_found",
          message: "Offer or line item was not found."
        }
      }),
      { status: 404 }
    );
  }

  return new Response(null, { status: 204 });
}
```

- [ ] **Step 2: Verify type-checking passes**

```bash
cd /Users/vlad/projects/solivio/apps/solivio && yarn typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add "apps/solivio/src/app/api/offers/[offerId]/products/[offerProductId]/route.ts"
git commit -m "feat: add PATCH and DELETE /api/offers/[offerId]/products/[offerProductId] routes"
```

---

### Task 6: Create offerLineItemTools.ts

Wrap the service functions as Vercel AI SDK `tool()` definitions. A future chat route handler imports and spreads `offerLineItemTools` into its `tools` option — no extra wiring required.

**Files:**
- Create: `apps/solivio/src/server/offers/offerLineItemTools.ts`

- [ ] **Step 1: Create the tools file**

Create `apps/solivio/src/server/offers/offerLineItemTools.ts`:

```ts
import "server-only";

import { tool } from "ai";
import { z } from "zod";

import {
  addProductToOffer,
  removeOfferLineItem,
  toOfferDomain,
  updateOfferLineItem
} from "./offerService";

export const offerLineItemTools = {
  add_product_to_offer: tool({
    description:
      "Add a product to an offer. Use this when the user asks to add a product by ID to the current offer.",
    parameters: z.object({
      offerId: z.string().uuid().describe("ID of the offer to add the product to"),
      productId: z.string().uuid().describe("ID of the product to add"),
      quantity: z.number().int().positive().describe("Number of units to add"),
      requestItem: z
        .string()
        .optional()
        .describe("The customer request item this product fulfills")
    }),
    execute: async ({ offerId, productId, quantity, requestItem }) => {
      const offer = await addProductToOffer(offerId, productId, quantity, requestItem);
      if (!offer) return { error: "offer_not_found" };
      return { offer: toOfferDomain(offer) };
    }
  }),

  update_offer_line_item: tool({
    description:
      "Update the quantity of a specific line item in an offer. Use this when the user asks to change how many units of a product are in the offer.",
    parameters: z.object({
      offerId: z.string().uuid().describe("ID of the offer containing the line item"),
      offerProductId: z.string().uuid().describe("ID of the line item to update"),
      quantity: z.number().int().positive().describe("New quantity for the line item")
    }),
    execute: async ({ offerId, offerProductId, quantity }) => {
      const offer = await updateOfferLineItem(offerProductId, offerId, quantity);
      if (!offer) return { error: "not_found" };
      return { offer: toOfferDomain(offer) };
    }
  }),

  remove_offer_line_item: tool({
    description:
      "Remove a product line item from an offer. Use this when the user asks to remove or delete a product from the offer.",
    parameters: z.object({
      offerId: z.string().uuid().describe("ID of the offer to remove the line item from"),
      offerProductId: z.string().uuid().describe("ID of the line item to remove")
    }),
    execute: async ({ offerId, offerProductId }) => {
      const removed = await removeOfferLineItem(offerProductId, offerId);
      if (!removed) return { error: "not_found" };
      return { success: true };
    }
  })
};
```

- [ ] **Step 2: Verify type-checking passes**

```bash
cd /Users/vlad/projects/solivio/apps/solivio && yarn typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/solivio/src/server/offers/offerLineItemTools.ts
git commit -m "feat: add Vercel AI SDK offer line item tools for chatbot integration"
```
