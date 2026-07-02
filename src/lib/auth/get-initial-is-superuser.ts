import { auth, currentUser } from "@clerk/nextjs/server";
import { cache } from "react";
import { getClerkEmails } from "@/lib/auth/app-user";
import { isSuperuser } from "@/lib/auth/is-superuser";
import { emailsFromSessionClaims } from "@/lib/auth/superuser-session";

/** Resolve superuser status on the server so the sidebar can render without client hydration. */
export const getInitialIsSuperuser = cache(async (): Promise<boolean> => {
  const { userId, sessionClaims } = await auth();
  if (!userId) return false;

  const claimEmails = emailsFromSessionClaims(
    sessionClaims as Record<string, unknown> | null | undefined
  );
  if (claimEmails.length > 0) {
    return isSuperuser(...claimEmails);
  }

  const clerkUser = await currentUser();
  if (!clerkUser) return false;

  return isSuperuser(
    clerkUser.primaryEmailAddress?.emailAddress,
    ...getClerkEmails(clerkUser)
  );
});
