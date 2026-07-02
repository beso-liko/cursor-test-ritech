import fs from "fs";
import path from "path";
import { expect, test } from "@playwright/test";
import {
  mockUploadUsageAtCap,
  mockUploadUsageNormal,
} from "./helpers/mock-apis";

const FIXTURE_PATH = path.join(__dirname, "fixtures/sample-study.txt");

test.describe("upload page UI", () => {
  test("shows limit notice and disables upload when cap is reached", async ({
    page,
  }) => {
    await mockUploadUsageAtCap(page);
    await page.goto("/upload");

    await expect(
      page.getByText(/You have reached your monthly upload limit/)
    ).toBeVisible();

    const buffer = fs.readFileSync(FIXTURE_PATH);
    await page.locator("#file-input").setInputFiles([
      { name: "blocked.txt", mimeType: "text/plain", buffer },
    ]);

    await expect(
      page.getByRole("button", { name: "Upload & Process" })
    ).toBeDisabled();
  });

  test("shows multi-file upload button when two files are selected", async ({
    page,
  }) => {
    await mockUploadUsageNormal(page);
    await page.goto("/upload");

    const buffer = fs.readFileSync(FIXTURE_PATH);
    await page.locator("#file-input").setInputFiles([
      { name: "batch-a.txt", mimeType: "text/plain", buffer },
      { name: "batch-b.txt", mimeType: "text/plain", buffer },
    ]);

    await expect(
      page.getByRole("button", { name: "Upload & Process 2 Files" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Upload & Process 2 Files" })
    ).toBeEnabled();
  });
});
