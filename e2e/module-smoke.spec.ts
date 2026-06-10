import { expect, test } from "@playwright/test";

/**
 * Smoke coverage for codegen-wired module surfaces: module API routes respond
 * behind auth, and module pages render inside the protected app shell.
 */

test("module API routes are session-gated", async ({ request }) => {
  const response = await request.get("/api/customers");
  expect(response.status()).toBe(401);
});

test("a signed-in admin reaches the module customers upload page", async ({ page }) => {
  const accountId = `e2em${Date.now().toString(36)}`;

  await page.goto("/login?mode=signup");
  await page.getByLabel("Username").fill(accountId);
  await page.getByLabel("Email").fill(`${accountId}@example.com`);
  await page.getByLabel("Password").fill("Solivio-e2e-12345");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/", { timeout: 30_000 });

  // Module-owned API route responds for a signed-in session.
  const customers = await page.request.get("/api/customers");
  expect(customers.ok()).toBeTruthy();
  expect(await customers.json()).toMatchObject({ customers: expect.any(Array) });

  // Module-owned admin page renders inside the protected shell (signup role
  // is admin in the demo/CI configuration).
  await page.goto("/admin/customers/upload");
  await expect(page.getByRole("heading", { name: "Import customers" })).toBeVisible();
});

test("products-sync runs against an external source and records a run", async ({ page }) => {
  const accountId = `e2es${Date.now().toString(36)}`;

  await page.goto("/login?mode=signup");
  await page.getByLabel("Username").fill(accountId);
  await page.getByLabel("Email").fill(`${accountId}@example.com`);
  await page.getByLabel("Password").fill("Solivio-e2e-12345");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/", { timeout: 30_000 });

  const fixture = [
    {
      sku: `SYNC-${accountId}-1`,
      name: "Synced widget",
      description: "From sync",
      priceNet: 10,
      priceGross: 12.3,
      vatRate: 23,
      currency: "PLN",
    },
    {
      sku: `SYNC-${accountId}-2`,
      name: "Synced gadget",
      description: "From sync",
      priceNet: 20,
      priceGross: 24.6,
      vatRate: 23,
      currency: "PLN",
    },
  ];
  const sourceUrl = `data:application/json,${encodeURIComponent(JSON.stringify(fixture))}`;

  const response = await page.request.post("/api/products-sync/runs", {
    data: { sourceUrl },
  });
  expect(response.ok()).toBeTruthy();
  const { run } = (await response.json()) as { run: { status: string; imported: number } };
  expect(run.status).toBe("succeeded");
  expect(run.imported).toBe(2);

  // The run shows up on the module admin page.
  await page.goto("/admin/products-sync");
  await expect(page.getByRole("heading", { name: "Products Sync" })).toBeVisible();
  await expect(page.getByText("data:application/json").first()).toBeVisible();
});

test("historical orders import creates read-only imported offers", async ({ page }) => {
  const accountId = `e2eo${Date.now().toString(36)}`;

  await page.goto("/login?mode=signup");
  await page.getByLabel("Username").fill(accountId);
  await page.getByLabel("Email").fill(`${accountId}@example.com`);
  await page.getByLabel("Password").fill("Solivio-e2e-12345");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/", { timeout: 30_000 });

  const csv = [
    "order_ref;customer;item;sku;quantity;unit_price;vat;date;currency",
    `ORD-${accountId};E2E Historical Co;Test widget;E2E-${accountId};2;10.00;23;2024-01-15;PLN`,
  ].join("\n");

  const response = await page.request.post("/api/offers/import", {
    data: { content: csv },
  });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { count: number };
  expect(body.count).toBe(1);

  // The module admin upload page renders.
  await page.goto("/admin/offers/upload");
  await expect(page.getByRole("heading", { name: "Import historical orders" })).toBeVisible();
});
