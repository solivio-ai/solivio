export type ProductPrice = {
  id: string;
  productId: string;
  currency: string;
  net: number;
  gross: number;
  vatRate: number;
  source: string;
};
