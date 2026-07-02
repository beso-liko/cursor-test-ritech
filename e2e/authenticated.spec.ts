import { expect, test } from "@playwright/test";

test.describe("authenticated app", () => {
  test("dashboard loads", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();
  });

  test("documents page loads", async ({ page }) => {
    await page.goto("/documents");
    await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();
  });

  test("upload page loads", async ({ page }) => {
    await page.goto("/upload");
    await expect(page.getByRole("heading", { name: "Upload Document" })).toBeVisible();
  });
});
