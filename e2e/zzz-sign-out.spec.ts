import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

test.describe("sign out", () => {
  test("signs out and redirects protected routes to sign-in", async ({ page }) => {
    await page.goto("/");
    await clerk.signOut({ page });
    await page.goto("/documents");
    await expect(page).toHaveURL(/sign-in/);
  });
});
