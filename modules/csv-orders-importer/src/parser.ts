import type { OfferImportInput, OfferImportLineItem } from "@solivio/sdk";

export type CsvParseResult = {
  headers: string[];
  rows: Record<string, string>[];
};

type OrderField =
  | "orderRef"
  | "customerName"
  | "itemName"
  | "sku"
  | "quantity"
  | "unitPriceNet"
  | "vatRate"
  | "orderDate"
  | "currency";

const COLUMN_ALIASES: Record<OrderField, string[]> = {
  orderRef: [
    "order_ref",
    "order_no",
    "order_number",
    "order",
    "numer",
    "numer_zamowienia",
    "zamowienie",
    "ref",
    "order_id",
  ],
  customerName: [
    "customer",
    "customer_name",
    "client",
    "client_name",
    "company",
    "company_name",
    "firma",
    "nazwa",
    "klient",
    "nazwa_klienta",
  ],
  itemName: [
    "item",
    "item_name",
    "product",
    "product_name",
    "name",
    "description",
    "opis",
    "produkt",
    "nazwa_produktu",
    "towar",
    "pozycja",
  ],
  quantity: ["quantity", "qty", "ilosc", "ilość", "ilosc_szt", "amount"],
  unitPriceNet: [
    "unit_price",
    "unit_price_net",
    "price",
    "net_price",
    "cena",
    "cena_netto",
    "cena_jednostkowa",
    "price_net",
  ],
  sku: ["sku", "product_sku", "product_code", "kod", "kod_produktu", "indeks"],
  vatRate: ["vat", "vat_rate", "vat_percent", "podatek", "stawka_vat"],
  orderDate: ["date", "order_date", "data", "data_zamowienia"],
  currency: ["currency", "waluta", "curr"],
};

function detectDelimiter(text: string): string {
  const newlineIdx = text.search(/\r?\n/);
  const headerLine = newlineIdx >= 0 ? text.slice(0, newlineIdx) : text;
  const candidates = [";", "\t", ","];
  let best = ",";
  let bestCount = -1;
  for (const d of candidates) {
    const count = headerLine.split(d).length - 1;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

export function parseCsv(text: string): CsvParseResult {
  // Strip UTF-8 BOM (0xFEFF) prepended by Excel and many Windows tools.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const delimiter = detectDelimiter(text);
  const rawRows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((v) => v.length > 0)) rawRows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((v) => v.length > 0)) rawRows.push(row);
  }

  if (rawRows.length === 0) return { headers: [], rows: [] };

  const headers = rawRows[0].map((h) => h.trim());
  const rows = rawRows.slice(1).map((entry) => {
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = (entry[i] ?? "").trim();
    });
    return record;
  });

  return { headers, rows };
}

export function resolveColumnMap(headers: string[]): Partial<Record<OrderField, string>> {
  const lower = headers.map((h) => h.toLowerCase());
  const map: Partial<Record<OrderField, string>> = {};
  for (const field of Object.keys(COLUMN_ALIASES) as OrderField[]) {
    const idx = lower.findIndex((h) => COLUMN_ALIASES[field].includes(h));
    if (idx >= 0) map[field] = headers[idx];
  }
  return map;
}

export function getMissingColumns(columnMap: Partial<Record<OrderField, string>>): string[] {
  return (["orderRef", "customerName", "itemName"] as const).filter((f) => !columnMap[f]);
}

export type OrderRowImportError = {
  index: number;
  message: string;
};

function parsePositiveNumber(value: string): number | undefined {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseNonNegativeNumber(value: string): number | undefined {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function extractOrders(
  rows: Record<string, string>[],
  columnMap: Partial<Record<OrderField, string>>,
): { records: OfferImportInput[]; rowErrors: OrderRowImportError[] } {
  const rowErrors: OrderRowImportError[] = [];

  const groups = new Map<string, Record<string, string>[]>();
  const groupFirstIndex = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const orderRef = columnMap.orderRef ? (row[columnMap.orderRef] ?? "").trim() : "";
    const itemName = columnMap.itemName ? (row[columnMap.itemName] ?? "").trim() : "";

    if (!orderRef) {
      rowErrors.push({ index: i, message: "Missing order reference" });
      continue;
    }
    if (!itemName) {
      rowErrors.push({ index: i, message: "Missing item name" });
      continue;
    }

    if (!groups.has(orderRef)) {
      groups.set(orderRef, []);
      groupFirstIndex.set(orderRef, i);
    }
    groups.get(orderRef)!.push(row);
  }

  const records: OfferImportInput[] = [];

  for (const [orderRef, orderRows] of groups) {
    const firstRow = orderRows[0];
    const customerName = columnMap.customerName
      ? (firstRow[columnMap.customerName] ?? "").trim()
      : "";

    if (!customerName) {
      rowErrors.push({
        index: groupFirstIndex.get(orderRef) ?? 0,
        message: `Missing customer name for order "${orderRef}"`,
      });
      continue;
    }

    const orderDate = columnMap.orderDate
      ? (firstRow[columnMap.orderDate] ?? "").trim() || null
      : null;
    const currency = columnMap.currency
      ? (firstRow[columnMap.currency] ?? "").trim() || undefined
      : undefined;

    const items: OfferImportLineItem[] = orderRows.map((row) => {
      const name = (row[columnMap.itemName!] ?? "").trim();
      const quantity = parsePositiveNumber(
        columnMap.quantity ? (row[columnMap.quantity] ?? "") : "",
      );
      const unitPriceNet = parseNonNegativeNumber(
        columnMap.unitPriceNet ? (row[columnMap.unitPriceNet] ?? "") : "",
      );
      const vatRate = parseNonNegativeNumber(
        columnMap.vatRate ? (row[columnMap.vatRate] ?? "") : "",
      );

      const sku = columnMap.sku ? (row[columnMap.sku] ?? "").trim() || undefined : undefined;

      const item: OfferImportLineItem = { name };
      if (sku !== undefined) item.sku = sku;
      if (quantity !== undefined) item.quantity = quantity;
      if (unitPriceNet !== undefined) item.unitPriceNet = unitPriceNet;
      if (vatRate !== undefined) item.vatRate = vatRate;
      return item;
    });

    const record: OfferImportInput = { orderRef, customerName, items };
    if (orderDate) record.orderDate = orderDate;
    if (currency) record.currency = currency;
    records.push(record);
  }

  return { records, rowErrors };
}
