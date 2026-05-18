export function calculateSubtotalNet(items: { quantity: number; unitPriceNet: number }[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPriceNet, 0);
}

export function calculateNetTotal(subtotalNet: number, discountPercent: number): number {
  return subtotalNet * (1 - discountPercent / 100);
}
