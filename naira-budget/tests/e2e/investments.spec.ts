import { test, expect } from "../fixtures/auth.fixture";

test("investments page loads", async ({ authenticatedPage: page }) => {
  await page.goto("/app/investments");
  await expect(page.getByRole("heading", { name: /investments|portfolio/i })).toBeVisible();
});
