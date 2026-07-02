"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useMemo } from "react";
import { useInitialIsSuperuser } from "@/components/SuperuserProvider";
import { isSuperuserFromClerkEmails } from "@/lib/auth/is-superuser";
import {
  clearLegacySuperuserCache,
  emailsFromSessionClaims,
} from "@/lib/auth/superuser-session";

/** Superuser check scoped to the signed-in user only. */
export function useIsSuperuser(): boolean {
  const initialIsSuperuser = useInitialIsSuperuser();
  const { sessionClaims, isLoaded: authLoaded, userId } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();

  useEffect(() => {
    clearLegacySuperuserCache();
  }, [userId]);

  const fromSessionClaims = useMemo(
    () =>
      isSuperuserFromClerkEmails(
        ...emailsFromSessionClaims(
          sessionClaims as Record<string, unknown> | null | undefined
        )
      ),
    [sessionClaims]
  );

  const fromUser = useMemo(() => {
    if (!user) return false;

    const emails = user.emailAddresses
      .map((entry) => entry.emailAddress)
      .filter(Boolean);

    return isSuperuserFromClerkEmails(
      user.primaryEmailAddress?.emailAddress,
      ...emails
    );
  }, [user]);

  if (initialIsSuperuser) return true;
  if (!userId) return false;
  if (authLoaded && fromSessionClaims) return true;
  if (userLoaded && fromUser) return true;
  return false;
}
