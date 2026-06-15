import { describe, expect, test } from "vitest";

import { importers } from "./importers.ts";

describe("csv-import module", () => {
  test("declares the expected importer capabilities", () => {
    expect(importers.map((importer) => `${importer.target}:${importer.name}`).sort()).toEqual([
      "customer:csv-customers",
      "offer:csv-orders",
      "product:csv-products",
    ]);
  });
});
