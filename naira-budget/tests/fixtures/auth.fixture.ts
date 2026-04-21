import { expect, test as base } from "@playwright/test";
import type { Page } from "@playwright/test";

type AuthFixture = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixture>({
  authenticatedPage: async ({ page }, use) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) {
      throw new Error("TEST_USER_EMAIL and TEST_USER_PASSWORD must be set.");
    }

    await page.goto("/login");
    await page.locator("#login-email").fill(email);
    await page.locator("#login-password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("**/app/dashboard**");
    await use(page);
  },
});

export { expect };
