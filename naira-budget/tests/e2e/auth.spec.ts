import { expect, test } from "@playwright/test";

function uniqueEmail() {
  return `e2e${Date.now()}@example.com`;
}

test.describe("Auth flows", () => {
  test("signup flow redirects to verify page", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Playwright User");
    await page.getByLabel("Email address").fill(uniqueEmail());
    await page.locator("#password").fill("TestPassword123!");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/verify\?email=/);
    await expect(page.getByRole("heading", { name: /check your email/i })).toBeVisible();
  });

  test("login flow redirects to dashboard", async ({ page }) => {
    test.skip(!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD, "Missing test credentials");
    await page.goto("/login");
    await page.locator("#login-email").fill(process.env.TEST_USER_EMAIL!);
    await page.locator("#login-password").fill(process.env.TEST_USER_PASSWORD!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/);
    await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  });

  test("login with wrong password shows an error", async ({ page }) => {
    test.skip(!process.env.TEST_USER_EMAIL, "Missing TEST_USER_EMAIL");
    await page.goto("/login");
    await page.locator("#login-email").fill(process.env.TEST_USER_EMAIL!);
    await page.locator("#login-password").fill("WrongPassword123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("empty form submission shows validation errors", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/enter a valid email address/i)).toBeVisible();
    await expect(page.getByText(/enter your password/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("session persists after reload", async ({ page }) => {
    test.skip(!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD, "Missing test credentials");
    await page.goto("/login");
    await page.locator("#login-email").fill(process.env.TEST_USER_EMAIL!);
    await page.locator("#login-password").fill(process.env.TEST_USER_PASSWORD!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/);

    await page.reload();
    await expect(page).toHaveURL(/\/app\/dashboard/);
  });

  test("protected route redirects to login when anonymous", async ({ page }) => {
    await page.goto("/app/dashboard", { waitUntil: "domcontentloaded", timeout: 15000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("sign out clears session", async ({ page }) => {
    test.skip(!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD, "Missing test credentials");
    await page.goto("/login");
    await page.locator("#login-email").fill(process.env.TEST_USER_EMAIL!);
    await page.locator("#login-password").fill(process.env.TEST_USER_PASSWORD!);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/app\/dashboard/);

    // Mobile projects hide sign-out in the sidebar; use settings page where it is always available.
    await page.goto("/app/settings");
    await page.getByRole("button", { name: /^sign out$/i }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
