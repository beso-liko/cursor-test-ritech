import { expect, test } from "@playwright/test";
import { chooseWholeDocumentGeneration } from "./helpers/focus-dialog";
import { mockGenerateApis } from "./helpers/mock-apis";
import {
  uploadStudyDocumentGroup,
  waitForDocumentReady,
} from "./helpers/upload-document";
import { shouldSkipUploadTests } from "./helpers/upload-limits";

test.describe("group upload", () => {
  test.setTimeout(240_000);

  test("uploads multiple files and opens the group page", async ({ page }) => {
    if (await shouldSkipUploadTests(page)) {
      test.skip(true, "Monthly upload limit reached for the E2E user");
    }

    await mockGenerateApis(page);
    const { groupId, fileA, fileB } = await uploadStudyDocumentGroup(page);

    await expect(page).toHaveURL(new RegExp(`/documents/group/${groupId}`));
    await waitForDocumentReady(page);

    await expect(page.getByText(fileA)).toBeVisible();
    await expect(page.getByText(fileB)).toBeVisible();
  });

  test("group page shows study tabs after choosing generation focus", async ({
    page,
  }) => {
    test.setTimeout(240_000);

    if (await shouldSkipUploadTests(page)) {
      test.skip(true, "Monthly upload limit reached for the E2E user");
    }

    await mockGenerateApis(page);
    const { groupId } = await uploadStudyDocumentGroup(page);
    await waitForDocumentReady(page);

    await expect(page).toHaveURL(new RegExp(`/documents/group/${groupId}`));
    await chooseWholeDocumentGeneration(page);

    await expect(page.getByRole("tab", { name: "Summary" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Flashcards" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Quiz" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Chat" })).toBeVisible();
  });
});
