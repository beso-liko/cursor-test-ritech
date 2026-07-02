import { expect, test } from "@playwright/test";
import { chooseWholeDocumentGeneration } from "./helpers/focus-dialog";
import { mockGenerateApis } from "./helpers/mock-apis";
import { uploadStudyDocument, waitForDocumentReady } from "./helpers/upload-document";
import { shouldSkipUploadTests } from "./helpers/upload-limits";

async function openFolderMenu(page: import("@playwright/test").Page, name: string) {
  const card = page
    .locator(".group")
    .filter({ has: page.getByRole("heading", { name, exact: true }) })
    .first();
  await card.hover();
  await card.getByRole("button").click();
}

test.describe.serial("documents page", () => {
  test.setTimeout(240_000);

  const folderName = `E2E Folder ${Date.now()}`;
  const renamedFolderName = `${folderName} Renamed`;
  let searchableFile = "";

  test("creates a new folder", async ({ page }) => {
    await page.goto("/documents");
    await page.getByRole("button", { name: "New Folder" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Folder name").fill(folderName);
    await dialog.getByRole("button", { name: "Create" }).click();

    await expect(page.getByText(folderName)).toBeVisible();
  });

  test("renames a folder", async ({ page }) => {
    await page.goto("/documents");
    await openFolderMenu(page, folderName);
    await page.getByRole("menuitem", { name: "Rename" }).click();

    const dialog = page.getByRole("dialog", { name: "Rename folder" });
    const nameInput = dialog.getByLabel("Folder name");
    await nameInput.clear();
    await nameInput.fill(renamedFolderName);

    const patchResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/document-groups/") &&
        response.request().method() === "PATCH" &&
        response.ok()
    );
    await dialog.getByRole("button", { name: "Save" }).click();
    await patchResponse;
    await expect(dialog).not.toBeVisible();

    await expect(page.getByRole("heading", { name: renamedFolderName })).toBeVisible();
  });

  test("deletes a folder from the menu", async ({ page }) => {
    const disposableFolder = `E2E Disposable ${Date.now()}`;

    await page.goto("/documents");
    await page.getByRole("button", { name: "New Folder" }).click();

    const createDialog = page.getByRole("dialog");
    await createDialog.getByLabel("Folder name").fill(disposableFolder);
    await createDialog.getByRole("button", { name: "Create" }).click();

    await openFolderMenu(page, disposableFolder);
    await page.getByRole("menuitem", { name: "Delete folder" }).click();
    await page.getByRole("button", { name: "Delete folder" }).click();

    await expect(
      page.getByRole("heading", { name: disposableFolder, exact: true })
    ).not.toBeVisible();
  });

  test("search filters documents by name", async ({ page }) => {
    if (await shouldSkipUploadTests(page)) {
      test.skip(true, "Monthly upload limit reached for the E2E user");
    }

    searchableFile = `e2e-search-${Date.now()}.txt`;
    await uploadStudyDocument(page, searchableFile);
    await waitForDocumentReady(page);

    await page.goto("/documents");
    await page
      .getByPlaceholder("Search folders and documents…")
      .fill(searchableFile);
    await expect(page.getByText(searchableFile)).toBeVisible();

    await page
      .getByPlaceholder("Search folders and documents…")
      .fill("zzz-no-match-xyz");
    await expect(
      page.getByText('No documents match "zzz-no-match-xyz"')
    ).toBeVisible();

    await page.getByPlaceholder("Search folders and documents…").fill("");
  });

  test("moves a document into a folder", async ({ page }) => {
    if (!searchableFile) {
      test.skip(true, "No document available to move (upload may have been skipped)");
    }

    await page.goto("/documents");

    const card = page.locator(".group").filter({ hasText: searchableFile });
    await card.hover();
    await card.getByRole("button").first().click();
    await page.getByRole("menuitem", { name: renamedFolderName }).click();

    await expect(card).not.toBeVisible();
    const folderCard = page.locator(".group").filter({ hasText: renamedFolderName });
    await expect(folderCard.getByText("1 document")).toBeVisible();
  });

  test("opens folder and views document inside", async ({ page }) => {
    if (!searchableFile) {
      test.skip(true, "No document available in folder (upload may have been skipped)");
    }

    await page.goto("/documents");
    await mockGenerateApis(page);
    await page.getByRole("link", { name: renamedFolderName }).first().click();
    await expect(page).toHaveURL(/\/documents\/group\//);
    await expect(page.getByText(searchableFile, { exact: true })).toBeVisible();
  });

  test("removes document from folder", async ({ page }) => {
    if (!searchableFile) {
      test.skip(true, "No document available to remove (upload may have been skipped)");
    }

    await page.goto("/documents");
    await mockGenerateApis(page);
    await page.getByRole("link", { name: renamedFolderName }).first().click();
    await expect(page).toHaveURL(/\/documents\/group\//);

    const focusDialog = page.getByRole("dialog", {
      name: /How should we generate your study materials\?/,
    });
    if (await focusDialog.isVisible().catch(() => false)) {
      await chooseWholeDocumentGeneration(page);
    }

    page.once("dialog", (dialog) => dialog.accept());

    const fileRow = page
      .locator(".group.flex.items-center")
      .filter({ has: page.getByText(searchableFile, { exact: true }) });
    await fileRow.locator("button").last().click();
    await page.getByRole("menuitem", { name: "Remove from folder" }).click();

    await expect(page.getByText(searchableFile)).not.toBeVisible();
    await page.goto("/documents");
    await expect(page.locator(".group").filter({ hasText: searchableFile })).toBeVisible();
    await expect(
      page.getByRole("link", { name: renamedFolderName, exact: true })
    ).not.toBeVisible();
  });

  test("deletes a document from the list", async ({ page }) => {
    if (!searchableFile) {
      test.skip(true, "No document available to delete (upload may have been skipped)");
    }

    await page.goto("/documents");
    page.once("dialog", (dialog) => dialog.accept());

    const unfiledCard = page.locator(".group").filter({ hasText: searchableFile });
    await expect(unfiledCard).toBeVisible();
    await unfiledCard.hover();
    await unfiledCard.getByRole("button").first().click();
    await page.getByRole("menuitem", { name: "Delete" }).click();

    await expect(unfiledCard).not.toBeVisible();
  });
});
