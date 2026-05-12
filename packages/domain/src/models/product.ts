import type { ProductPrice } from "./product-price";

export type ProductSource = "manual" | "import" | (string & {});

export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string;
  source: ProductSource;
  prices: ProductPrice[];
};

/** CSV / API import row shape. Drives the catalog upsert. */
export type ProductImportRow = {
  sku: string;
  name: string;
  description: string;
  priceNet: number;
  priceGross: number;
  vatRate: number;
  currency: string;
};
