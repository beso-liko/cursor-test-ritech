/** Env vars required to run Playwright E2E in CI (GitHub Actions secrets). */
export const E2E_REQUIRED_ENV = [
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "E2E_CLERK_USER_EMAIL",
  "E2E_CLERK_USER_PASSWORD",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export function hasE2eCredentials(): boolean {
  return E2E_REQUIRED_ENV.every((key) => Boolean(process.env[key]?.trim()));
}

/** Env forwarded to the Next.js dev server started by Playwright. */
export function getWebServerEnv(port: string | number): Record<string, string> {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      env[key] = value;
    }
  }

  Object.assign(env, {
    PORT: String(port),
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey,
    CLERK_PUBLISHABLE_KEY:
      process.env.CLERK_PUBLISHABLE_KEY ?? publishableKey,
    E2E_CLERK_USER_EMAIL: process.env.E2E_CLERK_USER_EMAIL ?? "",
    E2E_CLERK_USER_PASSWORD: process.env.E2E_CLERK_USER_PASSWORD ?? "",
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  });

  return env;
}
