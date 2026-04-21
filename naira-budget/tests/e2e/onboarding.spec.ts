import { test, expect } from "@playwright/test";

test("onboarding route renders", async ({ page }) => {
  await page.goto("/onboarding");
  await expect(page).toHaveURL(/\/onboarding/);
  await expect(page.getByText(/onboarding|income|bucket|rent/i).first()).toBeVisible();
});
