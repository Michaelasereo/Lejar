import { test, expect } from "../fixtures/auth.fixture";

test.describe("Expenses", () => {
  test("log a new expense", async ({ authenticatedPage: page }) => {
    await page.goto("/app/expenses");
    await page.getByLabel("Amount (₦)").fill("50000");
    await page.getByLabel("Category").selectOption("FOOD");
    await page.getByLabel("Note (optional)").fill("Shoprite run");
    await page.getByRole("button", { name: /add expense/i }).click();

    await expect(page.getByText(/expense logged/i)).toBeVisible();
    await expect(page.getByText("Shoprite run")).toBeVisible();
    await expect(page.getByText("₦50,000.00")).toBeVisible();
  });

  test("amount validation", async ({ authenticatedPage: page }) => {
    await page.goto("/app/expenses");

    await page.getByLabel("Amount (₦)").fill("");
    await page.getByRole("button", { name: /add expense/i }).click();
    await expect(page.getByText(/must be greater than 0|check your entries/i)).toBeVisible();

    await page.getByLabel("Amount (₦)").fill("0");
    await page.getByRole("button", { name: /add expense/i }).click();
    await expect(page.getByText(/must be greater than 0|check your entries/i)).toBeVisible();

    await page.getByLabel("Amount (₦)").fill("-10");
    await page.getByRole("button", { name: /add expense/i }).click();
    await expect(page.getByText(/must be greater than 0|check your entries/i)).toBeVisible();
  });

  test("delete expense", async ({ authenticatedPage: page }) => {
    const label = `Delete me ${Date.now()}`;
    await page.goto("/app/expenses");
    await page.getByLabel("Amount (₦)").fill("1234");
    await page.getByLabel("Category").selectOption("TRANSPORT");
    await page.getByLabel("Note (optional)").fill(label);
    await page.getByRole("button", { name: /add expense/i }).click();
    await expect(page.getByText(label)).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByText(label).locator("..").locator("button[aria-label='Delete']").click();
    await expect(page.getByText(/removed/i)).toBeVisible();
    await expect(page.getByText(label)).not.toBeVisible();
  });
});
