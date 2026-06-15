import { describe, expect, test } from "vitest";

import { csvCustomerImporter } from "./customerImporter.ts";

describe("csvCustomerImporter", () => {
  test("imports localized CSV with quoted delimiters and row errors", async () => {
    const csv = [
      "\uFEFFnazwa_klienta;źródło",
      '"  ACME   Sp. z o.o.  "; referral',
      '"Needs; quoting";web',
      ";missing-name",
    ].join("\n");

    const result = await csvCustomerImporter.run(csv);

    expect(result.status).toBe("partial");
    expect(result.records).toEqual([
      { name: "ACME Sp. z o.o.", source: "referral" },
      { name: "Needs; quoting", source: "web" },
    ]);
    expect(result.errors).toEqual([{ index: 2, message: "Missing or invalid field(s): name" }]);
  });

  test("fails when required columns are absent", async () => {
    const result = await csvCustomerImporter.run("source\nmanual");

    expect(result.status).toBe("failed");
    expect(result.records).toEqual([]);
    expect(result.errors).toEqual([{ message: "Missing required columns: name" }]);
  });
});
