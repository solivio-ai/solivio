import type { ProductInput } from "@solivio/sdk";

export type CsvParseResult = {
  headers: string[];
  rows: Record<string, string>[];
};

const COLUMN_ALIASES: Record<keyof ProductInput, string[]> = {
  sku: ["sku", "id", "kod", "index", "symbol"],
  name: ["name", "nazwa", "product", "produkt"],
  description: ["description", "opis", "summary"],
  priceNet: ["price_net", "pricenet", "cena_netto", "net_price", "netto"],
  priceGross: ["price_gross", "pricegross", "cena_brutto", "gross_price", "brutto"],
  vatRate: ["vat_rate", "vatrate", "vat", "stawka_vat", "tax_rate"],
  currency: ["currency", "waluta", "ccy"],
};

// Accepts European-formatted prices ("1.234,56" / "112,98") alongside
// plain "112.98" — strips dots that sit before three-digit groups, then
// promotes a trailing decimal comma to a dot before parsing.
function parseDecimal(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

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

export function resolveColumnMap(headers: string[]): Partial<Record<keyof ProductInput, string>> {
  const lower = headers.map((h) => h.toLowerCase());
  const map: Partial<Record<keyof ProductInput, string>> = {};
  for (const field of Object.keys(COLUMN_ALIASES) as (keyof ProductInput)[]) {
    const idx = lower.findIndex((h) => COLUMN_ALIASES[field].includes(h));
    if (idx >= 0) map[field] = headers[idx];
  }
  return map;
}

/** 0-based index into the data row array (excluding the header). */
export type ProductRowImportError = {
  index: number;
  sku?: string;
  message: string;
};

export function extractProductRows(
  rows: Record<string, string>[],
  columnMap: Partial<Record<keyof ProductInput, string>>,
): { records: ProductInput[]; rowErrors: ProductRowImportError[] } {
  const rowErrors: ProductRowImportError[] = [];

  if (
    !columnMap.sku ||
    !columnMap.name ||
    !columnMap.description ||
    !columnMap.priceNet ||
    !columnMap.priceGross ||
    !columnMap.vatRate ||
    !columnMap.currency
  ) {
    return { records: [], rowErrors: [] };
  }

  const result: ProductInput[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sku = row[columnMap.sku] ?? "";
    const name = row[columnMap.name] ?? "";
    const description = row[columnMap.description] ?? "";
    const currency = (row[columnMap.currency] ?? "").toUpperCase();
    const priceNet = parseDecimal(row[columnMap.priceNet] ?? "");
    const priceGross = parseDecimal(row[columnMap.priceGross] ?? "");
    const vatRate = parseDecimal(row[columnMap.vatRate] ?? "");

    if (
      sku &&
      name &&
      description &&
      currency &&
      priceNet !== null &&
      priceGross !== null &&
      vatRate !== null
    ) {
      result.push({
        sku,
        name,
        description,
        priceNet,
        priceGross,
        vatRate,
        currency,
      });
      continue;
    }

    const missing: string[] = [];
    if (!sku) missing.push("sku");
    if (!name) missing.push("name");
    if (!description) missing.push("description");
    if (!currency) missing.push("currency");
    if (priceNet === null) missing.push("priceNet");
    if (priceGross === null) missing.push("priceGross");
    if (vatRate === null) missing.push("vatRate");

    rowErrors.push({
      index: i,
      ...(sku ? { sku } : {}),
      message:
        missing.length > 0
          ? `Missing or invalid field(s): ${missing.join(", ")}`
          : "Row failed validation",
    });
  }

  return { records: result, rowErrors };
}

export function getMissingColumns(
  columnMap: Partial<Record<keyof ProductInput, string>>,
): string[] {
  return (Object.keys(COLUMN_ALIASES) as (keyof ProductInput)[]).filter(
    (field) => !columnMap[field],
  );
}
