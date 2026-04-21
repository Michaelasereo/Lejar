import { test, expect } from "../fixtures/auth.fixture";

test("jars page loads", async ({ authenticatedPage: page }) => {
  await page.goto("/app/jars");
  await expect(page.getByRole("heading", { name: /savings jars/i })).toBeVisible();
});
