import { test, expect } from "../fixtures/auth.fixture";

test.describe("Grocery", () => {
  test("add items and mark purchased", async ({ authenticatedPage: page }) => {
    const tomatoes = `Tomatoes ${Date.now()}`;
    const rice = `Rice 10kg ${Date.now()}`;

    await page.goto("/app/grocery");
    await page.getByPlaceholder("Item name").fill(tomatoes);
    await page.getByRole("button", { name: /^add$/i }).click();
    await expect(page.getByText(tomatoes)).toBeVisible();

    await page.getByPlaceholder("Item name").fill(rice);
    await page.getByRole("button", { name: /^add$/i }).click();
    await expect(page.getByText(rice)).toBeVisible();

    const tomatoesRow = page.getByText(tomatoes).locator("..").locator("..");
    await tomatoesRow.getByRole("checkbox").click();
    await expect(tomatoesRow.getByRole("checkbox")).toHaveAttribute("aria-checked", "true");
  });

  test("set price on item after editing", async ({ authenticatedPage: page }) => {
    const label = `Price item ${Date.now()}`;
    await page.goto("/app/grocery");
    await page.getByPlaceholder("Item name").fill(label);
    await page.getByRole("button", { name: /^add$/i }).click();
    await expect(page.getByText(label)).toBeVisible();

    const row = page.getByText(label).locator("..").locator("..");
    await row.getByRole("button", { name: "Edit" }).click();
    await row.getByPlaceholder("Est. ₦").fill("4500");
    await row.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("₦4,500.00")).toBeVisible();
  });
});
