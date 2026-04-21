import { test, expect } from "../fixtures/auth.fixture";

test("dashboard loads for authenticated user", async ({ authenticatedPage: page }) => {
  await page.goto("/app/dashboard");
  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  await expect(page.getByText(/overview/i)).toBeVisible();
});
