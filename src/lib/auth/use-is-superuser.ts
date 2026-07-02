"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useInitialIsSuperuser } from "@/components/SuperuserProvider";
import { isSuperuserFromClerkEmails } from "@/lib/auth/is-superuser";
import {
  emailsFromSessionClaims,
  readCachedSuperuserFlag,
  subscribeToSuperuserCache,
  writeCachedSuperuserFlag,
} from "@/lib/auth/superuser-session";

/** Superuser check: server seed, session cache, then Clerk session claims/user. */
export function useIsSuperuser(): boolean {
  const initialIsSuperuser = useInitialIsSuperuser();
  const cachedIsSuperuser = useSyncExternalStore(
    subscribeToSuperuserCache,
    readCachedSuperuserFlag,
    () => false
  );
  const { sessionClaims, isLoaded: authLoaded } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();

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

  const resolved =
    initialIsSuperuser ||
    cachedIsSuperuser ||
    (authLoaded && fromSessionClaims) ||
    (userLoaded && fromUser);

  useEffect(() => {
    if (resolved) {
      writeCachedSuperuserFlag(true);
      return;
    }

    if (authLoaded && userLoaded) {
      writeCachedSuperuserFlag(false);
    }
  }, [resolved, authLoaded, userLoaded]);

  return resolved;
}
