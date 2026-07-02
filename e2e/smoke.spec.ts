import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

test.describe("public routes", () => {
  test("protected routes redirect to sign-in", async ({ page }) => {
    await page.goto("/documents");
    await expect(page).toHaveURL(/sign-in/);
  });

  test("sign-in page loads Clerk UI", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/sign-in");
    await page.waitForSelector(".cl-signIn-root", { state: "attached" });
    await expect(page.locator("input[name=identifier]")).toBeVisible();
  });
});
