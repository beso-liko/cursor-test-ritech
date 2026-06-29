"use client";

import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function AuthControls() {
  return (
    <div className="flex items-center gap-2">
      <Show when="signed-out">
        <SignInButton mode="redirect">
          <Button variant="outline" size="sm">
            <span className="hidden sm:inline">Sign in</span>
            <span className="sm:hidden">In</span>
          </Button>
        </SignInButton>
        <SignUpButton mode="redirect">
          <Button size="sm">
            <span className="hidden sm:inline">Sign up</span>
            <span className="sm:hidden">Up</span>
          </Button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-8 h-8",
            },
          }}
        />
      </Show>
    </div>
  );
}
