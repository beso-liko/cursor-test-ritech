import { auth, currentUser } from "@clerk/nextjs/server";
import { linkClerkToSupabase, type AppUser } from "@/lib/auth/link-clerk-user";

export type { AppUser };

export function getClerkEmails(
  clerkUser: NonNullable<Awaited<ReturnType<typeof currentUser>>>
): string[] {
  const emails = (clerkUser.emailAddresses ?? [])
    .map((entry) => entry.emailAddress)
    .filter(Boolean) as string[];

  const primary = clerkUser.primaryEmailAddress?.emailAddress;
  if (primary && !emails.includes(primary)) {
    emails.unshift(primary);
  }

  return [...new Set(emails.map((value) => value.toLowerCase()))];
}

/** Resolve the signed-in Clerk user to their Supabase auth user. */
export async function getAppUser(): Promise<AppUser | null> {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return null;

    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const clerkEmails = getClerkEmails(clerkUser);
    if (clerkEmails.length === 0) {
      console.error("Clerk user has no email addresses:", clerkUserId);
      return null;
    }

    return await linkClerkToSupabase({
      clerkUserId,
      emails: clerkEmails,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
    });
  } catch (err) {
    console.error("getAppUser failed:", err);
    return null;
  }
}
