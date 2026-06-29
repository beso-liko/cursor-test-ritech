"use client";

import { useEffect, useState } from "react";
import {
  SignIn,
  ClerkLoaded,
  ClerkLoading,
  ClerkFailed,
} from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import ClerkAuthLoadError from "@/components/ClerkAuthLoadError";

const LOAD_TIMEOUT_MS = 8000;

export default function ClerkSignInPanel() {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="w-full max-w-md">
      <ClerkLoading>
        {timedOut ? (
          <ClerkAuthLoadError />
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Loading sign in…</p>
          </div>
        )}
      </ClerkLoading>
      <ClerkFailed>
        <ClerkAuthLoadError />
      </ClerkFailed>
      <ClerkLoaded>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/"
        />
      </ClerkLoaded>
    </div>
  );
}
