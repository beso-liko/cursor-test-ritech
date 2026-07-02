import { expect, test, type Page } from "@playwright/test";

async function openNotesManager(page: Page) {
  await page.getByRole("button", { name: "Notes" }).click();
  await page.getByRole("button", { name: "View notes" }).click();
  await expect(page.getByRole("dialog", { name: "Your notes" })).toBeVisible();
}

test.describe.serial("notes", () => {
  const noteFolderName = `E2E Notes Folder ${Date.now()}`;
  const renamedNoteTitle = "E2E Renamed Note";

  test("creates a note and shows saved content", async ({ page }) => {
    test.setTimeout(60_000);

    await page.goto("/");
    await page.getByRole("button", { name: "Notes" }).click();
    await page.getByRole("button", { name: "Create note" }).click();

    const editor = page.locator(".ProseMirror").first();
    await expect(editor).toBeVisible({ timeout: 15_000 });
    await editor.click();
    await editor.fill("E2E test note about photosynthesis");

    await expect(editor).toContainText("E2E test note about photosynthesis", {
      timeout: 15_000,
    });
  });

  test("renames a note from the manager", async ({ page }) => {
    await page.goto("/");
    await openNotesManager(page);

    const noteRow = page
      .locator(".rounded-xl.border")
      .filter({ hasText: "Untitled" })
      .first();
    await noteRow.getByRole("button", { name: "Rename" }).click();

    const dialog = page.getByRole("dialog", { name: "Rename" });
    await dialog.locator("input").fill(renamedNoteTitle);
    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText(renamedNoteTitle)).toBeVisible();
  });

  test("creates a note folder and moves the note into it", async ({ page }) => {
    await page.goto("/");
    await openNotesManager(page);

    await page.getByRole("button", { name: "New folder" }).click();
    const folderDialog = page.getByRole("dialog", { name: "New note folder" });
    await folderDialog.getByLabel("Folder name").fill(noteFolderName);
    await folderDialog.getByRole("button", { name: "Create" }).click();

    await expect(page.getByRole("button", { name: noteFolderName })).toBeVisible();
    await page.getByRole("button", { name: "All notes" }).click();

    const noteRow = page
      .locator(".rounded-xl.border")
      .filter({ hasText: renamedNoteTitle });
    await expect(noteRow).toBeVisible();
    await noteRow.getByRole("button", { name: "Move note" }).click();
    await page.getByRole("menuitem", { name: noteFolderName }).click();

    await page.getByRole("button", { name: noteFolderName }).click();
    await expect(noteRow).toBeVisible();
    await expect(noteRow.getByText(noteFolderName)).toBeVisible();
  });

  test("deletes a note from the manager", async ({ page }) => {
    await page.goto("/");
    await openNotesManager(page);
    await page.getByRole("button", { name: noteFolderName }).click();

    const noteRow = page
      .locator(".rounded-xl.border")
      .filter({ hasText: renamedNoteTitle });
    await noteRow.getByRole("button", { name: "Delete" }).click();

    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText(renamedNoteTitle)).not.toBeVisible();
  });
});
