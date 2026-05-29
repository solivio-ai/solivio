import "server-only";

import { z } from "zod";

import { normalizeCustomerName } from "@solivio/domain";
import type { ImportRowError, OfferImportInput } from "@solivio/sdk";
import { db, getService } from "@solivio/sdk/runtime";

import { appConfig } from "./appConfig.ts";
import type { InsertOfferItemData } from "./offerRepository.ts";
import { insertOffer, insertOfferItems } from "./offerRepository.ts";

const offerImportLineItemSchema = z
  .object({
    name: z.string().min(1),
    sku: z.string().optional(),
    description: z.string().optional(),
    quantity: z.number().positive().optional(),
    unitPriceNet: z.number().nonnegative().optional(),
    vatRate: z.number().nonnegative().optional(),
  })
  .strict();

const offerImportRecordSchema = z
  .object({
    orderRef: z.string().min(1),
    customerName: z.string().transform(normalizeCustomerName).pipe(z.string().min(1)),
    orderDate: z.string().nullable().optional(),
    currency: z.string().optional(),
    items: z.array(offerImportLineItemSchema).min(1),
  })
  .strict();

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function computeTotals(quantity: number, unitPriceNet: number, vatRate: number) {
  const unitGrossPrice = round4(unitPriceNet * (1 + vatRate / 100));
  const totalNet = round4(quantity * unitPriceNet);
  const totalGross = round4(quantity * unitGrossPrice);
  return { unitGrossPrice, totalNet, totalGross };
}

export async function importOffers(records: unknown[]): Promise<{
  count: number;
  errors: ImportRowError[];
}> {
  if (records.length === 0) return { count: 0, errors: [] };

  const errors: ImportRowError[] = [];
  const valid: OfferImportInput[] = [];

  records.forEach((record, index) => {
    const parsed = offerImportRecordSchema.safeParse(record);
    if (!parsed.success) {
      errors.push({ index, message: "Invalid order record" });
      return;
    }
    valid.push(parsed.data as OfferImportInput);
  });

  if (valid.length === 0) return { count: 0, errors };

  const allSkus = [
    ...new Set(valid.flatMap((o) => o.items.map((i) => i.sku).filter((s): s is string => !!s))),
  ];

  // Cross-module lookups happen through services before the offers transaction:
  // the customer upsert is idempotent inside the customers module, and product
  // ids are read-only references.
  const skuMatches =
    allSkus.length > 0 ? await getService("catalog").lookupBySkus(allSkus) : new Map();
  const skuToProductId = new Map([...skuMatches.entries()].map(([sku, match]) => [sku, match.id]));
  const customerIdByName = new Map<string, string>();
  for (const name of new Set(valid.map((order) => order.customerName))) {
    const customer = await getService("customers").upsertByName(name, "import");
    customerIdByName.set(name, customer.id);
  }

  let created = 0;
  await db.transaction(async (tx) => {
    for (const order of valid) {
      const createdAt =
        order.orderDate && !Number.isNaN(Date.parse(order.orderDate))
          ? new Date(order.orderDate)
          : undefined;

      const offer = await insertOffer(
        {
          name: order.orderRef,
          customerId: customerIdByName.get(order.customerName) ?? null,
          requestId: null,
          userId: null,
          status: "imported",
          currency: order.currency ?? appConfig.defaultCurrency,
          notes: [],
          ...(createdAt ? { createdAt } : {}),
        },
        tx,
      );

      const items: InsertOfferItemData[] = order.items.map((item, position) => {
        const quantity = item.quantity ?? 1;
        const unitPriceNet = item.unitPriceNet ?? 0;
        const vatRate = item.vatRate ?? 23;
        const { unitGrossPrice, totalNet, totalGross } = computeTotals(
          quantity,
          unitPriceNet,
          vatRate,
        );
        const productId = item.sku ? (skuToProductId.get(item.sku) ?? null) : null;
        return {
          offerId: offer.id,
          productId,
          name: item.name,
          description: item.description ?? "",
          quantity,
          unitPriceNet,
          vatRate,
          unitGrossPrice,
          totalNet,
          totalGross,
          requestItem: "",
          rationale: "",
          matchSource: null,
          matchScore: null,
          position,
        };
      });

      await insertOfferItems(items, tx);
      created += 1;
    }
  });

  return { count: created, errors };
}
