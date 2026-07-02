import { expect, test } from "@playwright/test";
import { chooseWholeDocumentGeneration } from "./helpers/focus-dialog";
import {
  mockChatOffTopic,
  mockGenerateApis,
  mockValidateFocusValid,
} from "./helpers/mock-apis";
import { uploadAndWaitForReady } from "./helpers/upload-document";
import { shouldSkipUploadTests } from "./helpers/upload-limits";

test.describe("settings and locale", () => {
  test("switches theme to dark and back to light", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.getByRole("button", { name: "Light" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("saves profile name on account settings", async ({ page }) => {
    await page.goto("/account-settings");
    await expect(
      page.getByRole("heading", { name: "Account Settings" })
    ).toBeVisible();

    await page.getByLabel("First Name").fill("E2E");
    await page.getByLabel("Last Name").fill("Tester");
    await page.getByRole("button", { name: "Save Profile" }).click();

    await expect(page.getByText("Profile saved successfully.")).toBeVisible();
  });

  test("shows password mismatch error on account settings", async ({ page }) => {
    await page.goto("/account-settings");
    await expect(
      page.getByRole("heading", { name: "Account Settings" })
    ).toBeVisible();

    await page.getByLabel("New Password").fill("password123");
    await page.getByLabel("Confirm Password").fill("different456");
    await page.getByRole("button", { name: "Update Password" }).click();

    await expect(page.getByText("Passwords do not match.")).toBeVisible();
  });

  test("switches language to Albanian and back", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();

    await page.getByRole("button", { name: "SQ", exact: true }).click();
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Paneli" })
    ).toBeVisible();

    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();
  });
});

test.describe("valid generation focus", () => {
  test.setTimeout(240_000);

  test("accepts an on-topic focus and closes the dialog", async ({ page }) => {
    if (await shouldSkipUploadTests(page)) {
      test.skip(true, "Monthly upload limit reached for the E2E user");
    }

    await mockGenerateApis(page);
    await mockValidateFocusValid(page);

    const documentId = await uploadAndWaitForReady(page);
    await page.goto(`/documents/${documentId}`);

    const dialog = page.getByRole("dialog", {
      name: /How should we generate your study materials\?/,
    });
    await expect(dialog).toBeVisible({ timeout: 180_000 });

    await dialog
      .getByRole("button", { name: "Generate material focusing specifically on…" })
      .click();
    await page.locator("#generation-focus").fill("photosynthesis");
    await dialog.getByRole("button", { name: "Generate", exact: true }).click();

    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("tab", { name: "Summary" })).toBeVisible();
  });
});

test.describe("chat off-topic", () => {
  test.setTimeout(240_000);

  test("shows off-topic message when chat rejects the question", async ({
    page,
  }) => {
    if (await shouldSkipUploadTests(page)) {
      test.skip(true, "Monthly upload limit reached for the E2E user");
    }

    await mockGenerateApis(page);
    await mockChatOffTopic(page);

    const documentId = await uploadAndWaitForReady(page);
    await page.goto(`/documents/${documentId}`);
    await chooseWholeDocumentGeneration(page);

    await page.getByRole("tab", { name: "Chat" }).click();
    await page
      .getByPlaceholder("Ask anything about this document…")
      .fill("What's the weather in Paris?");
    await page
      .getByPlaceholder("Ask anything about this document…")
      .press("Enter");

    await expect(
      page.getByText(
        "I can only generate study material related to your uploaded document"
      )
    ).toBeVisible({ timeout: 15_000 });
  });
});
