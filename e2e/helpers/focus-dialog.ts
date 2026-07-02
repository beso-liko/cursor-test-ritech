import { expect, type Page } from "@playwright/test";

export async function chooseWholeDocumentGeneration(page: Page) {
  const dialog = page.getByRole("dialog");

  if (!(await dialog.isVisible().catch(() => false))) {
    await page
      .getByRole("button", { name: "Generate", exact: true })
      .first()
      .click();
  }

  await expect(dialog).toBeVisible();
  const wholeMaterialButton = dialog.getByRole("button", {
    name: /Generate material on the entire (document|study set)/,
  });
  await wholeMaterialButton.click();
  await dialog.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(dialog).not.toBeVisible();
}

export async function openChangeFocusDialog(page: Page) {
  await page.getByRole("button", { name: "Change generation focus" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

export async function chooseFocusedGeneration(page: Page, focus: string) {
  const dialog = page.getByRole("dialog");

  if (!(await dialog.isVisible().catch(() => false))) {
    await page
      .getByRole("button", { name: "Generate", exact: true })
      .first()
      .click();
  }

  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("button", { name: "Generate material focusing specifically on…" })
    .click();
  await page.locator("#generation-focus").fill(focus);
  await dialog.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(dialog).not.toBeVisible();
}
