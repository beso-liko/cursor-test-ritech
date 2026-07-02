import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import { loadTestEnv } from "./load-env";

loadTestEnv();

setup("clerk testing env", async () => {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("Set CLERK_SECRET_KEY in .env.local (test instance only).");
  }

  await clerkSetup({ dotenv: false });
});
