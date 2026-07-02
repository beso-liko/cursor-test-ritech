import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { getWebServerEnv } from "./e2e/ci-env";
import { loadTestEnv } from "./e2e/load-env";

loadTestEnv();

const PORT = process.env.PORT || 3000;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: path.join(__dirname, "e2e"),
  outputDir: "test-results/",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60_000,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"], ["html"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: isCI ? "npm run build && npm run start" : "npm run dev",
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: isCI ? 300_000 : 120_000,
    env: getWebServerEnv(PORT),
  },
  projects: [
    {
      name: "global setup",
      testMatch: /global\.setup\.ts/,
    },
    {
      name: "smoke",
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["global setup"],
    },
    {
      name: "auth setup",
      testMatch: /auth\.setup\.ts/,
      dependencies: ["global setup"],
      timeout: 120_000,
    },
    {
      name: "authenticated",
      testMatch:
        /(authenticated|upload|document-detail|navigation|documents|group-upload|study-content|settings|notes|dashboard|upload-limits|zzz-sign-out)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.clerk/user.json",
      },
      dependencies: ["auth setup"],
    },
  ],
});
