import type { Page } from "@playwright/test";
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
  await expectGeneratedPageHeading(page, "/admin/customers/upload", "Import customers");
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
  await expectGeneratedPageHeading(page, "/admin/products-sync", "Products Sync");
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
  await expectGeneratedPageHeading(page, "/admin/offers/upload", "Import historical orders");
});

async function expectGeneratedPageHeading(page: Page, pathname: string, heading: string) {
  const response = await page.goto(pathname);

  if (!response) throw new Error(`No document response while navigating to ${pathname}`);

  expect(response.status(), `${pathname} responded with ${response.status()}`).toBeLessThan(400);
  expect(new URL(page.url()).pathname, `${pathname} should not redirect`).toBe(pathname);

  try {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible({ timeout: 15_000 });
  } catch (error) {
    const title = await page.title().catch(() => "");
    const body = await page
      .locator("body")
      .innerText({ timeout: 1_000 })
      .catch(() => "");
    const details = [
      `Expected heading "${heading}" on ${pathname}.`,
      `Current URL: ${page.url()}`,
      `Status: ${response.status()}`,
      `Title: ${title}`,
      `Body excerpt: ${body.slice(0, 1_000)}`,
    ].join("\n");

    throw new Error(`${details}\n\n${error instanceof Error ? error.message : String(error)}`);
  }
}
