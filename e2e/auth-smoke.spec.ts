import { expect, test } from "@playwright/test";

test("health endpoint reports the app and database as reachable", async ({ request }) => {
  const response = await request.get("/api/health");

  await expect(response).toBeOK();

  const body = await response.json();

  expect(body).toMatchObject({
    app: "solivio",
    status: "ok",
  });
  expect(body.database.status).toBe("reachable");
});

test("a visitor can create an account and reach the dashboard", async ({ page }) => {
  const accountId = `e2e${Date.now().toString(36)}`;

  await page.goto("/login?mode=signup");

  await expect(page.getByRole("heading", { name: "Create account" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create account" })).toBeEnabled();

  await page.getByLabel("Username").fill(accountId);
  await page.getByLabel("Email").fill(`${accountId}@example.com`);
  await page.getByLabel("Password").fill("Solivio-e2e-12345");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL("/", { timeout: 30_000 });
  await expect(page.getByText("Start a new offer")).toBeVisible();
  await expect(page.getByText("Draft an offer from a customer request.")).toBeVisible();
});
