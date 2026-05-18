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
