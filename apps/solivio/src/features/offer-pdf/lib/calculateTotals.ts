import Decimal from "decimal.js";

import type { OfferItem } from "./schema";

export type ItemTotals = {
  valueNet: number;
  vatAmount: number;
  valueGross: number;
};

export type OfferTotals = {
  /** Sum of line net values at list price, before discount. */
  subtotalNet: number;
  /** Discount percentage applied to the offer subtotal, in [0, 100]. */
  discountPercent: number;
  /** Discount value in currency, deducted from subtotalNet. */
  discountAmount: number;
  /** Net after discount. Equals subtotalNet when discountPercent is 0. */
  totalNet: number;
  /** VAT recomputed on the discounted net (proportional reduction). */
  totalVat: number;
  /** Net + VAT, both after discount. */
  totalGross: number;
};

export type ItemWithTotals = OfferItem & ItemTotals;

export function calculateItemTotals(item: OfferItem): ItemTotals {
  const qty = new Decimal(item.quantity);
  const price = new Decimal(item.unitPriceNet);
  const rate = new Decimal(item.vatRate);

  const valueNet = qty.mul(price).toDecimalPlaces(2);
  const vatAmount = valueNet.mul(rate).toDecimalPlaces(2);
  const valueGross = valueNet.add(vatAmount).toDecimalPlaces(2);

  return {
    valueNet: valueNet.toNumber(),
    vatAmount: vatAmount.toNumber(),
    valueGross: valueGross.toNumber(),
  };
}

export function calculateTotals(
  items: OfferItem[],
  discountPercent: number = 0
): {
  itemsWithTotals: ItemWithTotals[];
  totals: OfferTotals;
} {
  const itemsWithTotals = items.map((item) => ({
    ...item,
    ...calculateItemTotals(item),
  }));

  const subtotalNet = itemsWithTotals
    .reduce((sum, i) => sum.add(new Decimal(i.valueNet)), new Decimal(0))
    .toDecimalPlaces(2);

  const subtotalVat = itemsWithTotals
    .reduce((sum, i) => sum.add(new Decimal(i.vatAmount)), new Decimal(0))
    .toDecimalPlaces(2);

  const discountFactor = new Decimal(discountPercent).div(100);
  const discountAmount = subtotalNet.mul(discountFactor).toDecimalPlaces(2);
  const totalNet = subtotalNet.sub(discountAmount).toDecimalPlaces(2);
  const totalVat = subtotalVat
    .mul(new Decimal(1).sub(discountFactor))
    .toDecimalPlaces(2);
  const totalGross = totalNet.add(totalVat).toDecimalPlaces(2);

  return {
    itemsWithTotals,
    totals: {
      subtotalNet: subtotalNet.toNumber(),
      discountPercent,
      discountAmount: discountAmount.toNumber(),
      totalNet: totalNet.toNumber(),
      totalVat: totalVat.toNumber(),
      totalGross: totalGross.toNumber(),
    },
  };
}
