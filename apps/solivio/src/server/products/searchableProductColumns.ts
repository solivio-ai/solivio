import { products } from "@/server/database/schema";

export const FIELD_COLUMNS = {
  sku: products.sku,
  name: products.name,
  description: products.description,
};
