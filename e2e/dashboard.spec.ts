import { expect, test } from "@playwright/test";

test.describe("dashboard", () => {
  test("shows stats cards and recent documents section", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("main").getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();

    await expect(page.getByText("Documents", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Flashcards", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Quizzes", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Attempts", { exact: true }).first()).toBeVisible();

    const recentHeading = page.getByRole("heading", { name: "Recent Documents" });
    const emptyTitle = page.getByRole("heading", { name: "No documents yet" });

    await expect(recentHeading.or(emptyTitle)).toBeVisible();

    if (await recentHeading.isVisible()) {
      await expect(
        page.getByRole("button", { name: "View all" })
      ).toBeVisible();
    } else {
      await expect(
        page.getByRole("link", { name: "Upload your first document" })
      ).toBeVisible();
    }
  });

  test("navigates to documents via View all", async ({ page }) => {
    await page.goto("/");

    const viewAll = page.getByRole("button", { name: "View all" });
    if (!(await viewAll.isVisible())) {
      test.skip(true, "No recent documents on dashboard");
    }

    await viewAll.click();
    await expect(page).toHaveURL(/\/documents/);
    await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();
  });
});
