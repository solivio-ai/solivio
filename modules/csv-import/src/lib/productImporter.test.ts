import { describe, expect, test } from "vitest";

import { csvProductImporter } from "./productImporter.ts";

describe("csvProductImporter", () => {
  test("imports European decimals and reports invalid rows", async () => {
    const csv = [
      "kod;nazwa;opis;cena_netto;cena_brutto;stawka_vat;waluta",
      "SKU-1;Cable;Copper cable;1.234,56;1.518,51;23;pln",
      "SKU-2;Broken;Bad price;abc;12,30;23;PLN",
    ].join("\n");

    const result = await csvProductImporter.run(csv);

    expect(result.status).toBe("partial");
    expect(result.records).toEqual([
      {
        sku: "SKU-1",
        name: "Cable",
        description: "Copper cable",
        priceNet: 1234.56,
        priceGross: 1518.51,
        vatRate: 23,
        currency: "PLN",
      },
    ]);
    expect(result.errors).toEqual([
      {
        index: 1,
        sku: "SKU-2",
        message: "Missing or invalid field(s): priceNet",
      },
    ]);
  });
});
