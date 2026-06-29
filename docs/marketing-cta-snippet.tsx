/**
 * Copy into your marketing repo. Use absolute app URLs so CTAs work on studybuddy.al.
 *
 * .env.local:
 *   NEXT_PUBLIC_APP_URL=http://localhost:3001
 *
 * Production (Vercel):
 *   NEXT_PUBLIC_APP_URL=https://app.studybuddy.al
 */

export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://app.studybuddy.al";
}

export function appSignUpUrl(): string {
  return `${getAppUrl()}/sign-up`;
}

export function appSignInUrl(): string {
  return `${getAppUrl()}/sign-in`;
}

// Example usage in a hero or nav component:
//
// import Link from "next/link";
// import { appSignUpUrl, appSignInUrl } from "@/lib/app-links";
//
// <Link href={appSignUpUrl()}>Get started</Link>
// <Link href={appSignInUrl()}>Sign in</Link>
