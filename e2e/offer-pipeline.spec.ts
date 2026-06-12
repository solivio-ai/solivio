import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

test("quick offer flow persists, accepts, and locks line item edits", async ({ page }) => {
  const accountId = `e2ep${Date.now().toString(36)}`;
  await signUp(page, accountId);

  const sku = `PIPE-${accountId}`;
  const importResponse = await page.request.post("/api/products/import", {
    data: {
      content: [
        "sku;name;description;price_net;price_gross;vat_rate;currency",
        `${sku};Pipeline widget;Imported for offer pipeline;100;123;23;PLN`,
      ].join("\n"),
    },
  });
  await expect(importResponse).toBeOK();
  expect(await importResponse.json()).toMatchObject({ count: 1 });

  const searchResponse = await page.request.post("/api/products/text-search", {
    data: { query: sku, limit: 1, searchFields: ["sku"] },
  });
  await expect(searchResponse).toBeOK();
  const searchBody = (await searchResponse.json()) as {
    products: Array<{ id: string; sku: string; name: string }>;
  };
  const product = searchBody.products.find((candidate) => candidate.sku === sku);
  expect(product, `Imported product ${sku} should be searchable by SKU`).toBeTruthy();
  if (!product) throw new Error(`Imported product ${sku} was not returned by text search`);

  const quickOfferResponse = await page.request.post("/api/offers/quick", {
    data: {
      customerName: `Pipeline Customer ${accountId}`,
      items: [
        {
          productId: product.id,
          productName: product.name,
          productSku: product.sku,
          quantity: 2,
        },
      ],
    },
  });
  expect(quickOfferResponse.status()).toBe(201);
  const quickOfferBody = (await quickOfferResponse.json()) as {
    offer: { id: string; status: string; items: Array<{ id?: string; totalNet: number }> };
  };
  const offer = quickOfferBody.offer;
  const lineItem = offer.items[0];
  if (!lineItem?.id) throw new Error("Quick offer did not return a persisted line item id");

  expect(offer.status).toBe("draft");
  expect(lineItem.totalNet).toBe(200);

  const acceptResponse = await page.request.patch(`/api/offers/${offer.id}`, {
    data: { status: "accepted" },
  });
  await expect(acceptResponse).toBeOK();
  expect(await acceptResponse.json()).toMatchObject({ offer: { status: "accepted" } });

  const lockedEditResponse = await page.request.patch(
    `/api/offers/${offer.id}/products/${lineItem.id}`,
    { data: { quantity: 3 } },
  );
  expect(lockedEditResponse.status()).toBe(403);
  expect(await lockedEditResponse.json()).toMatchObject({
    error: { code: "offer_locked" },
  });
});

async function signUp(page: Page, accountId: string) {
  await page.goto("/login?mode=signup");
  await page.getByLabel("Username").fill(accountId);
  await page.getByLabel("Email").fill(`${accountId}@example.com`);
  await page.getByLabel("Password").fill("Solivio-e2e-12345");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/", { timeout: 30_000 });
}
