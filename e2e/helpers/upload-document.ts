import { expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

const FIXTURE_PATH = path.join(__dirname, "../fixtures/sample-study.txt");

export async function uploadStudyDocument(
  page: Page,
  fileName = `e2e-photosynthesis-${Date.now()}.txt`
) {
  const buffer = fs.readFileSync(FIXTURE_PATH);

  await page.goto("/upload");
  await page.locator("#file-input").setInputFiles({
    name: fileName,
    mimeType: "text/plain",
    buffer,
  });

  await page.getByRole("button", { name: "Upload & Process" }).click();
  await page.waitForURL(/\/documents\/[0-9a-f-]+/, { timeout: 120_000 });

  const match = page.url().match(/\/documents\/([^/?]+)/);
  if (!match) throw new Error("Expected redirect to a document detail page");

  return match[1];
}

export async function waitForDocumentReady(page: Page) {
  await expect(
    page.getByText("Ready", { exact: true }).first()
  ).toBeVisible({ timeout: 180_000 });
}

export async function uploadAndWaitForReady(page: Page) {
  const documentId = await uploadStudyDocument(page);
  await waitForDocumentReady(page);
  return documentId;
}

export async function uploadStudyDocumentGroup(page: Page) {
  const buffer = fs.readFileSync(FIXTURE_PATH);
  const stamp = Date.now();
  const fileA = `e2e-group-a-${stamp}.txt`;
  const fileB = `e2e-group-b-${stamp}.txt`;

  await page.goto("/upload");
  await page.locator("#file-input").setInputFiles([
    { name: fileA, mimeType: "text/plain", buffer },
    { name: fileB, mimeType: "text/plain", buffer },
  ]);

  await page.getByRole("button", { name: "Upload & Process 2 Files" }).click();
  await page.waitForURL(/\/documents\/group\/[0-9a-f-]+/, {
    timeout: 120_000,
  });

  const match = page.url().match(/\/documents\/group\/([^/?]+)/);
  if (!match) throw new Error("Expected redirect to a group detail page");

  return { groupId: match[1], fileA, fileB };
}
