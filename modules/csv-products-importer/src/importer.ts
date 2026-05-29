import type { ImporterDefinition, ImportResult } from "@solivio/sdk";

import { extractProductRows, getMissingColumns, parseCsv, resolveColumnMap } from "./parser.js";

export const csvProductImporter: ImporterDefinition = {
  name: "csv-products",
  description: "Imports products from a CSV file into the core product catalog.",
  target: "product",
  accept: [".csv", "text/csv"],
  run: async (payload: unknown): Promise<ImportResult> => {
    if (typeof payload !== "string") {
      return {
        status: "failed",
        records: [],
        errors: [{ message: "Expected CSV file contents as a string" }],
      };
    }

    const { headers, rows } = parseCsv(payload);

    if (headers.length === 0) {
      return {
        status: "failed",
        records: [],
        errors: [{ message: "CSV is empty or unreadable" }],
      };
    }

    const columnMap = resolveColumnMap(headers);
    const missing = getMissingColumns(columnMap);

    if (missing.length > 0) {
      return {
        status: "failed",
        records: [],
        errors: [{ message: `Missing required columns: ${missing.join(", ")}` }],
      };
    }

    const { records, rowErrors } = extractProductRows(rows, columnMap);
    const errors: ImportResult["errors"] = [...rowErrors];

    if (records.length === 0) {
      return {
        status: "failed",
        records: [],
        errors: errors.length > 0 ? errors : [{ message: "No valid rows found" }],
      };
    }

    return {
      status: rowErrors.length > 0 ? "partial" : "success",
      records,
      errors,
    };
  },
};
