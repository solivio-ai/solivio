/** Normalized customer row produced by customer importers. */
export interface CustomerInput {
  /** Display/company name used to link offers to customers. */
  name: string;
  /** Optional source marker supplied by the importer. Defaults to `import` in core. */
  source?: string;
}
