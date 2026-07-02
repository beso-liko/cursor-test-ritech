import fs from "fs";
import path from "path";

/** Load `.env.local` and map Next.js Clerk env names for @clerk/testing. */
export function loadTestEnv() {
  const root = path.join(__dirname, "..");
  const envLocalPath = path.join(root, ".env.local");

  if (fs.existsSync(envLocalPath)) {
    process.loadEnvFile(envLocalPath);
  }

  if (
    !process.env.CLERK_PUBLISHABLE_KEY &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ) {
    process.env.CLERK_PUBLISHABLE_KEY =
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  }
}
