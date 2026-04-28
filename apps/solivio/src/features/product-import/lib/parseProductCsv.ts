import type { ProductImportRow } from "@solivio/domain";

export type CsvParseResult = {
  headers: string[];
  rows: Record<string, string>[];
};

const COLUMN_ALIASES: Record<keyof ProductImportRow, string[]> = {
  sku: ["sku", "id", "kod", "index", "symbol"],
  name: ["name", "nazwa", "product", "produkt"],
  description: ["description", "opis", "summary"],
  manufacturer: ["manufacturer", "marka", "brand", "producent", "vendor"]
};

export function parseCsv(text: string): CsvParseResult {
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
    } else if (char === "," || char === ";" || char === "\t") {
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

export function resolveColumnMap(
  headers: string[]
): Partial<Record<keyof ProductImportRow, string>> {
  const lower = headers.map((h) => h.toLowerCase());
  const map: Partial<Record<keyof ProductImportRow, string>> = {};
  for (const field of Object.keys(COLUMN_ALIASES) as (keyof ProductImportRow)[]) {
    const idx = lower.findIndex((h) => COLUMN_ALIASES[field].includes(h));
    if (idx >= 0) map[field] = headers[idx];
  }
  return map;
}

export function extractProductRows(
  rows: Record<string, string>[],
  columnMap: Partial<Record<keyof ProductImportRow, string>>
): ProductImportRow[] {
  if (!columnMap.sku || !columnMap.name || !columnMap.description || !columnMap.manufacturer) {
    return [];
  }
  const result: ProductImportRow[] = [];
  for (const row of rows) {
    const product: ProductImportRow = {
      sku: row[columnMap.sku] ?? "",
      name: row[columnMap.name] ?? "",
      description: row[columnMap.description] ?? "",
      manufacturer: row[columnMap.manufacturer] ?? ""
    };
    if (product.sku && product.name && product.description && product.manufacturer) {
      result.push(product);
    }
  }
  return result;
}

export function getMissingColumns(
  columnMap: Partial<Record<keyof ProductImportRow, string>>
): string[] {
  return (Object.keys(COLUMN_ALIASES) as (keyof ProductImportRow)[]).filter(
    (field) => !columnMap[field]
  );
}
