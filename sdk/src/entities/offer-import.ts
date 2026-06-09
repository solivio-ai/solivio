export interface OfferImportLineItem {
  name: string;
  sku?: string;
  description?: string;
  quantity?: number;
  unitPriceNet?: number;
  vatRate?: number;
}

export interface OfferImportInput {
  orderRef: string;
  customerName: string;
  orderDate?: string | null;
  currency?: string;
  items: OfferImportLineItem[];
}
