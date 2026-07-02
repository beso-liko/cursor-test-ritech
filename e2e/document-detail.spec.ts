import { expect, test } from "@playwright/test";
import {
  chooseFocusedGeneration,
  chooseWholeDocumentGeneration,
  openChangeFocusDialog,
} from "./helpers/focus-dialog";
import {
  mockChatApi,
  mockGenerateApis,
  mockGenerateApisWithSummaryRegenerate,
  mockValidateFocusOffTopic,
  mockValidateFocusValid,
} from "./helpers/mock-apis";
import { uploadAndWaitForReady } from "./helpers/upload-document";
import { shouldSkipUploadTests } from "./helpers/upload-limits";

test.describe.serial("document detail", () => {
  test.setTimeout(240_000);

  let documentUrl = "";

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({
      storageState: "playwright/.clerk/user.json",
    });
    const page = await context.newPage();

    if (await shouldSkipUploadTests(page)) {
      await context.close();
      return;
    }

    await mockGenerateApis(page);
    const documentId = await uploadAndWaitForReady(page);
    documentUrl = `/documents/${documentId}`;
    await context.close();
  });

  test.beforeEach(async ({ page }) => {
    if (!documentUrl) {
      test.skip(true, "Monthly upload limit reached for the E2E user");
    }
    await mockGenerateApis(page);
    await page.goto(documentUrl);
    await expect(page.getByText("Ready", { exact: true }).first()).toBeVisible();
  });

  test("shows all study tabs after choosing whole-document generation", async ({
    page,
  }) => {
    await chooseWholeDocumentGeneration(page);

    await expect(page.getByRole("tab", { name: "Summary" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Flashcards" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Quiz" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Chat" })).toBeVisible();
  });

  test("can switch between summary and chat tabs", async ({ page }) => {
    await chooseWholeDocumentGeneration(page);

    await page.getByRole("tab", { name: "Chat" }).click();
    await expect(
      page.getByPlaceholder("Ask anything about this document…")
    ).toBeVisible();

    await page.getByRole("tab", { name: "Summary" }).click();
    await expect(page.getByText("Summary").first()).toBeVisible();
  });

  test("rejects an off-topic generation focus", async ({ page }) => {
    await chooseWholeDocumentGeneration(page);
    await mockValidateFocusOffTopic(page);
    await openChangeFocusDialog(page);

    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: "Generate material focusing specifically on…" })
      .click();
    await page.locator("#generation-focus").fill("weather in Paris");
    await dialog.getByRole("button", { name: "Generate", exact: true }).click();

    await expect(page.getByRole("alert")).toContainText(
      "doesn't seem related to your uploaded material"
    );
    await expect(dialog).toBeVisible();
  });

  test("sends a chat message and shows a mocked reply", async ({ page }) => {
    await chooseWholeDocumentGeneration(page);
    await mockChatApi(page);

    await page.getByRole("tab", { name: "Chat" }).click();
    await page
      .getByPlaceholder("Ask anything about this document…")
      .fill("What is photosynthesis?");
    await page
      .getByPlaceholder("Ask anything about this document…")
      .press("Enter");

    await expect(page.getByText("What is photosynthesis?")).toBeVisible();
    await expect(
      page.getByText("Photosynthesis converts light energy into chemical energy in plants.")
    ).toBeVisible();
  });

  test("navigates back to documents list", async ({ page }) => {
    await chooseWholeDocumentGeneration(page);

    await page.getByRole("button", { name: "All documents" }).click();
    await expect(page).toHaveURL(/\/documents/);
    await expect(page.getByRole("heading", { name: "Documents" })).toBeVisible();
  });

  test("regenerates summary content", async ({ page }) => {
    await mockGenerateApisWithSummaryRegenerate(page);
    await chooseWholeDocumentGeneration(page);

    await page.getByRole("tab", { name: "Summary" }).click();
    await expect(
      page.getByText("Mock summary about photosynthesis in plants.")
    ).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Generate Summary" }).click();
    await expect(
      page.getByText("Regenerated summary with updated study content.")
    ).toBeVisible({ timeout: 15_000 });
  });

  test("changes generation focus to a specific topic", async ({ page }) => {
    await chooseWholeDocumentGeneration(page);
    await mockValidateFocusValid(page);
    await openChangeFocusDialog(page);
    await chooseFocusedGeneration(page, "chlorophyll");

    await expect(page.getByText("Focused on: chlorophyll").first()).toBeVisible();
  });
});
