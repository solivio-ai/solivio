import Decimal from "decimal.js";

import type { OfferItem } from "./schema";

export type ItemTotals = {
  valueNet: number;
  vatAmount: number;
  valueGross: number;
};

export type OfferTotals = {
  totalNet: number;
  totalVat: number;
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

export function calculateTotals(items: OfferItem[]): {
  itemsWithTotals: ItemWithTotals[];
  totals: OfferTotals;
} {
  const itemsWithTotals = items.map((item) => ({
    ...item,
    ...calculateItemTotals(item),
  }));

  const totalNet = itemsWithTotals
    .reduce((sum, i) => sum.add(new Decimal(i.valueNet)), new Decimal(0))
    .toDecimalPlaces(2)
    .toNumber();

  const totalVat = itemsWithTotals
    .reduce((sum, i) => sum.add(new Decimal(i.vatAmount)), new Decimal(0))
    .toDecimalPlaces(2)
    .toNumber();

  const totalGross = new Decimal(totalNet)
    .add(new Decimal(totalVat))
    .toDecimalPlaces(2)
    .toNumber();

  return { itemsWithTotals, totals: { totalNet, totalVat, totalGross } };
}
