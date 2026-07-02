import { expect, test } from "@playwright/test";
import { uploadStudyDocument, waitForDocumentReady } from "./helpers/upload-document";
import { shouldSkipUploadTests } from "./helpers/upload-limits";

test.describe.serial("upload flow", () => {
  test.setTimeout(240_000);

  test("uploads a text file and opens the document page", async ({ page }) => {
    if (await shouldSkipUploadTests(page)) {
      test.skip(true, "Monthly upload limit reached for the E2E user");
    }
    const fileName = `e2e-upload-${Date.now()}.txt`;
    const documentId = await uploadStudyDocument(page, fileName);

    await expect(page).toHaveURL(new RegExp(`/documents/${documentId}`));
    // After processing, the required focus dialog opens and hides the page h1 from a11y.
    await expect(
      page.getByRole("dialog", {
        name: /How should we generate your study materials\?/,
      })
    ).toBeVisible({ timeout: 180_000 });
  });

  test("uploaded document appears on the documents list", async ({ page }) => {
    if (await shouldSkipUploadTests(page)) {
      test.skip(true, "Monthly upload limit reached for the E2E user");
    }

    const fileName = `e2e-list-${Date.now()}.txt`;
    await uploadStudyDocument(page, fileName);
    await waitForDocumentReady(page);

    await page.goto("/documents");
    await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();
    await expect(page.getByText(fileName)).toBeVisible();
  });
});
