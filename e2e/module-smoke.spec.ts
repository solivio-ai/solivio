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
