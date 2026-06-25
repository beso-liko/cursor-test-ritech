"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserClient } from "@/lib/supabase/client";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { useLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { locale, setLocale, t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Silently pre-fetch whether the email is registered when the user
  // moves from the email field to the password field, so the result is
  // ready the moment a login attempt fails (no extra round-trip delay).
  const emailExistsRef = useRef<{ email: string; exists: boolean } | null>(null);

  const handleEmailBlur = async () => {
    if (!email) return;
    try {
      const res = await fetch("/api/auth/check-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const { exists } = await res.json();
      emailExistsRef.current = { email, exists };
    } catch {
      emailExistsRef.current = null;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Use the pre-fetched result if it matches the current email,
        // otherwise fall back to fetching now.
        let exists: boolean;
        if (emailExistsRef.current?.email === email) {
          exists = emailExistsRef.current.exists;
        } else {
          try {
            const res = await fetch("/api/auth/check-user", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            });
            exists = (await res.json()).exists ?? false;
          } catch {
            exists = true; // safe fallback — don't wrongly say user doesn't exist
          }
        }

        setError(exists ? t("auth.login.error.invalidCredentials") : t("auth.login.error.noUser"));
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError(t("auth.login.error.unexpected"));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Language switcher */}
      <div className="absolute top-4 right-4">
        <div className="flex items-center gap-1 rounded-xl bg-muted/50 p-1">
          <button
            onClick={() => setLocale("en")}
            className={cn(
              "px-3 text-xs font-semibold py-1.5 rounded-lg transition-all",
              locale === "en"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            EN
          </button>
          <button
            onClick={() => setLocale("sq")}
            className={cn(
              "px-3 text-xs font-semibold py-1.5 rounded-lg transition-all",
              locale === "sq"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            SQ
          </button>
        </div>
      </div>

      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-primary to-orange-700 shadow-lg shadow-primary/40 flex items-center justify-center mb-4">
            <GraduationCap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            StudyBuddy
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("auth.login.subtitle")}
          </p>
        </div>

        {/* Google sign-in */}
        <GoogleSignInButton label={t("auth.google")} />

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs text-muted-foreground">
            <span className="bg-background px-2">{t("auth.login.orEmail")}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("auth.login.email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={handleEmailBlur}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("auth.login.password")}</Label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                {t("auth.login.forgotPassword")}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("auth.login.submitting")}
              </>
            ) : (
              t("auth.login.submit")
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("auth.login.noAccount")}{" "}
          <Link
            href="/auth/signup"
            className="text-primary font-medium hover:underline"
          >
            {t("auth.login.signUp")}
          </Link>
        </p>
      </div>
    </div>
  );
}
