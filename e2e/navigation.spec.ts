import { expect, test } from "@playwright/test";

test.describe("sidebar navigation", () => {
  test("desktop sidebar links navigate to main pages", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: /Documents/ }).click();
    await expect(page).toHaveURL(/\/documents/);
    await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();

    await page.getByRole("link", { name: /Upload/ }).click();
    await expect(page).toHaveURL(/\/upload/);
    await expect(
      page.getByRole("heading", { name: "Upload Document" })
    ).toBeVisible();

    await page.getByRole("link", { name: /Dashboard/ }).click();
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();

    await page.getByRole("link", { name: /Account Settings/ }).click();
    await expect(page).toHaveURL(/\/account-settings/);
    await expect(
      page.getByRole("heading", { name: "Account Settings" })
    ).toBeVisible();
  });
});

test.describe("mobile navigation", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("mobile menu opens and navigates to documents", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("complementary")).toBeVisible();

    await page.getByRole("link", { name: /Documents/ }).click();
    await expect(page).toHaveURL(/\/documents/);
    await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();
  });
});
