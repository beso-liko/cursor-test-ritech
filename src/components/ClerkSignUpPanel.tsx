"use client";

import { useEffect, useState } from "react";
import {
  SignUp,
  ClerkLoaded,
  ClerkLoading,
  ClerkFailed,
} from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import ClerkAuthLoadError from "@/components/ClerkAuthLoadError";
import { authClerkAppearance } from "@/lib/auth-clerk-appearance";

const LOAD_TIMEOUT_MS = 8000;

export default function ClerkSignUpPanel() {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="auth-page-clerk w-full">
      <ClerkLoading>
        {timedOut ? (
          <ClerkAuthLoadError />
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Loading sign up…</p>
          </div>
        )}
      </ClerkLoading>
      <ClerkFailed>
        <ClerkAuthLoadError />
      </ClerkFailed>
      <ClerkLoaded>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          fallbackRedirectUrl="/"
          appearance={authClerkAppearance}
        />
      </ClerkLoaded>
    </div>
  );
}
