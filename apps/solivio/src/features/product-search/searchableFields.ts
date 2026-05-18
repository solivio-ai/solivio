export const ALL_SEARCHABLE_FIELDS = ["sku", "name", "description"] as const;

export type SearchableField = (typeof ALL_SEARCHABLE_FIELDS)[number];

/** Convert a camelCase or snake_case field slug to a human-readable label. */
export function fieldLabel(field: string): string {
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
