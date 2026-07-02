import { expect, test } from "@playwright/test";
import { chooseWholeDocumentGeneration } from "./helpers/focus-dialog";
import {
  mockGenerateApis,
  mockQuizResultApi,
  mockQuizVariantApi,
} from "./helpers/mock-apis";
import { uploadAndWaitForReady } from "./helpers/upload-document";
import { shouldSkipUploadTests } from "./helpers/upload-limits";

test.describe.serial("study content", () => {
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
    await mockQuizVariantApi(page);
    await mockQuizResultApi(page);
    await page.goto(documentUrl);
    await expect(page.getByText("Ready", { exact: true }).first()).toBeVisible();
    await chooseWholeDocumentGeneration(page);
  });

  test("shows generated summary content", async ({ page }) => {
    await page.getByRole("tab", { name: "Summary" }).click();
    await expect(
      page.getByText("Mock summary about photosynthesis in plants.")
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Light energy conversion")).toBeVisible();
  });

  test("flips flashcards to reveal answers", async ({ page }) => {
    await page.getByRole("tab", { name: "Flashcards" }).click();
    await expect(page.getByText("What is photosynthesis?")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByText("Click to reveal answer").click();
    await expect(
      page.getByText("Converting light to chemical energy")
    ).toBeVisible();
  });

  test("navigates between flashcards", async ({ page }) => {
    await page.getByRole("tab", { name: "Flashcards" }).click();
    await expect(page.getByText("What is photosynthesis?")).toBeVisible({
      timeout: 15_000,
    });

    await page.locator("button:has(svg.lucide-chevron-right)").click();
    await expect(page.getByText("What pigment absorbs light?")).toBeVisible();
  });

  test("navigates back to previous flashcard", async ({ page }) => {
    await page.getByRole("tab", { name: "Flashcards" }).click();
    await expect(page.getByText("What is photosynthesis?")).toBeVisible({
      timeout: 15_000,
    });

    await page.locator("button:has(svg.lucide-chevron-right)").click();
    await expect(page.getByText("What pigment absorbs light?")).toBeVisible();

    await page.locator("button:has(svg.lucide-chevron-left)").click();
    await expect(page.getByText("What is photosynthesis?")).toBeVisible();
    await expect(page.getByText("What pigment absorbs light?")).not.toBeVisible();
  });

  test("completes a quiz and shows results", async ({ page }) => {
    await page.getByRole("tab", { name: "Quiz" }).click();
    await expect(page.getByRole("button", { name: "Start Quiz" })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "Start Quiz" }).click();
    await expect(page.getByText("What does photosynthesis produce?")).toBeVisible();

    await page.getByRole("button", { name: "Oxygen" }).click();
    await page.getByRole("button", { name: "Next Question" }).click();

    await expect(
      page.getByText("Where does photosynthesis occur in plant cells?")
    ).toBeVisible();
    await page.getByRole("button", { name: "Chloroplasts" }).click();
    await page.getByRole("button", { name: "See Results" }).click();

    await expect(page.getByText("100%")).toBeVisible();
    await expect(page.getByText("2 / 2 correct")).toBeVisible();
  });

  test("shows partial score when quiz answers are wrong", async ({ page }) => {
    await page.getByRole("tab", { name: "Quiz" }).click();
    await expect(page.getByRole("button", { name: "Start Quiz" })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "Start Quiz" }).click();
    await page.getByRole("button", { name: "Nitrogen" }).click();
    await page.getByRole("button", { name: "Next Question" }).click();
    await page.getByRole("button", { name: "Mitochondria" }).click();
    await page.getByRole("button", { name: "See Results" }).click();

    await expect(page.getByText("0%")).toBeVisible();
    await expect(page.getByText("0 / 2 correct")).toBeVisible();
    await expect(page.getByText("Need more practice")).toBeVisible();
  });

  test("retakes a quiz after seeing results", async ({ page }) => {
    await page.getByRole("tab", { name: "Quiz" }).click();
    await expect(page.getByRole("button", { name: "Start Quiz" })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "Start Quiz" }).click();
    await page.getByRole("button", { name: "Oxygen" }).click();
    await page.getByRole("button", { name: "Next Question" }).click();
    await page.getByRole("button", { name: "Chloroplasts" }).click();
    await page.getByRole("button", { name: "See Results" }).click();

    await expect(page.getByText("100%")).toBeVisible();
    await page.getByRole("button", { name: "Retake Quiz" }).click();

    await expect(page.getByText("What does photosynthesis produce?")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Question 1 of 2")).toBeVisible();
  });
});
