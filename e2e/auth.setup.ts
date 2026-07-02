import { clerk } from "@clerk/testing/playwright";
import { createClerkClient } from "@clerk/backend";
import { test as setup } from "@playwright/test";
import fs from "fs";
import path from "path";
import { loadTestEnv } from "./load-env";

loadTestEnv();

setup.describe.configure({ mode: "serial" });

const authDir = path.join(__dirname, "../playwright/.clerk");
const authFile = path.join(authDir, "user.json");

setup("ensure test user", async () => {
  const email = process.env.E2E_CLERK_USER_EMAIL;
  const password = process.env.E2E_CLERK_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Set E2E_CLERK_USER_EMAIL and E2E_CLERK_USER_PASSWORD in .env.local (use a +clerk_test address)."
    );
  }

  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("Set CLERK_SECRET_KEY in .env.local (test instance only).");
  }

  const client = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  const { data: users } = await client.users.getUserList({
    emailAddress: [email],
  });

  if (users.length === 0) {
    await client.users.createUser({
      emailAddress: [email],
      password,
      firstName: "E2E",
      lastName: "Test",
    });
  } else {
    await client.users.updateUser(users[0].id, { password });
  }
});

setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_CLERK_USER_EMAIL!;

  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
  await page.goto("/");
  await page.getByRole("heading", { name: "Dashboard" }).waitFor();

  fs.mkdirSync(authDir, { recursive: true });
  await page.context().storageState({ path: authFile });
});
