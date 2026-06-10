/**
 * Customer-selection vocabulary shared between the customers module (which
 * implements selection) and its consumers (which catch selection failures).
 */

export class CustomerSelectionError extends Error {
  constructor(
    readonly code: "customer_not_found" | "customer_mismatch",
    message: string,
  ) {
    super(message);
    this.name = "CustomerSelectionError";
  }
}

export function normalizeCustomerName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function customerNamesMatch(left: string, right: string): boolean {
  return normalizeCustomerName(left).toLowerCase() === normalizeCustomerName(right).toLowerCase();
}
