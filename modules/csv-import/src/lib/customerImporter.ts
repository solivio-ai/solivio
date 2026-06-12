import type { CustomerInput, ImporterDefinition, ImportResult } from "@solivio/sdk";

import {
  extractCustomerRows,
  getMissingColumns,
  parseCsv,
  resolveColumnMap,
} from "./customerParser.ts";

export const csvCustomerImporter: ImporterDefinition<unknown, CustomerInput> = {
  name: "csv-customers",
  description: "Imports customers from a CSV file into the core customer list.",
  target: "customer",
  accept: [".csv", "text/csv"],
  run: async (payload: unknown): Promise<ImportResult<CustomerInput>> => {
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

    const { records, rowErrors } = extractCustomerRows(rows, columnMap);
    const errors: ImportResult<CustomerInput>["errors"] = [...rowErrors];

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
