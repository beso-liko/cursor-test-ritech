import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getClerkEmails } from "@/lib/auth/app-user";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { isSuperuser } from "@/lib/auth/is-superuser";
import type { AppUser } from "@/lib/auth/link-clerk-user";

export async function requireSuperuser(): Promise<
  { user: AppUser } | NextResponse
> {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  const clerkUser = await currentUser();
  const clerkEmails = clerkUser ? getClerkEmails(clerkUser) : [];

  if (!isSuperuser(auth.user.email, ...clerkEmails)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return auth;
}
