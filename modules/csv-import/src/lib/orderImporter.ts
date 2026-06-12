import type { ImporterDefinition, ImportResult, OfferImportInput } from "@solivio/sdk";

import { extractOrders, getMissingColumns, parseCsv, resolveColumnMap } from "./orderParser.ts";

export const csvOrderImporter: ImporterDefinition<unknown, OfferImportInput> = {
  name: "csv-orders",
  description: "Imports historical orders from a CSV file as read-only offers.",
  target: "offer",
  accept: [".csv", "text/csv"],
  run: async (payload: unknown): Promise<ImportResult<OfferImportInput>> => {
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

    const { records, rowErrors } = extractOrders(rows, columnMap);
    const errors = [...rowErrors];

    if (records.length === 0) {
      return {
        status: "failed",
        records: [],
        errors: errors.length > 0 ? errors : [{ message: "No valid orders found" }],
      };
    }

    return {
      status: rowErrors.length > 0 ? "partial" : "success",
      records,
      errors,
    };
  },
};
