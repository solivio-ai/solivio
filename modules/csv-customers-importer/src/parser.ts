import type { CustomerInput } from "@solivio/sdk";

export type CsvParseResult = {
  headers: string[];
  rows: Record<string, string>[];
};

type CustomerField = keyof CustomerInput;

const COLUMN_ALIASES: Record<CustomerField, string[]> = {
  name: [
    "name",
    "customer",
    "customer_name",
    "client",
    "client_name",
    "company",
    "company_name",
    "firma",
    "nazwa",
    "nazwa_klienta",
    "klient",
  ],
  source: ["source", "źródło", "zrodlo", "origin"],
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

export function resolveColumnMap(headers: string[]): Partial<Record<CustomerField, string>> {
  const lower = headers.map((h) => h.toLowerCase());
  const map: Partial<Record<CustomerField, string>> = {};
  for (const field of Object.keys(COLUMN_ALIASES) as CustomerField[]) {
    const idx = lower.findIndex((h) => COLUMN_ALIASES[field].includes(h));
    if (idx >= 0) map[field] = headers[idx];
  }
  return map;
}

/** 0-based index into the data row array (excluding the header). */
export type CustomerRowImportError = {
  index: number;
  name?: string;
  message: string;
};

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function extractCustomerRows(
  rows: Record<string, string>[],
  columnMap: Partial<Record<CustomerField, string>>,
): { records: CustomerInput[]; rowErrors: CustomerRowImportError[] } {
  const rowErrors: CustomerRowImportError[] = [];

  if (!columnMap.name) {
    return { records: [], rowErrors: [] };
  }

  const result: CustomerInput[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = normalizeName(row[columnMap.name] ?? "");
    const source = columnMap.source ? normalizeName(row[columnMap.source] ?? "") : "";

    if (name) {
      result.push({ name, ...(source ? { source } : {}) });
      continue;
    }

    rowErrors.push({
      index: i,
      message: "Missing or invalid field(s): name",
    });
  }

  return { records: result, rowErrors };
}

export function getMissingColumns(columnMap: Partial<Record<CustomerField, string>>): string[] {
  return ["name"].filter((field) => !columnMap[field as CustomerField]);
}
