"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserClient } from "@/lib/supabase/client";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { useLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  const router = useRouter();
  const { locale, setLocale, t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError(t("auth.signup.error.passwordMismatch"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.signup.error.passwordShort"));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/check-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const { exists } = await res.json();
      if (exists) {
        setError(t("auth.signup.error.emailExists"));
        setLoading(false);
        return;
      }
    } catch {
      // If the check fails, proceed and let Supabase handle it
    }

    const supabase = createBrowserClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // If email confirmation is disabled, the user is immediately signed in
    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }

    // Email confirmation required
    setSuccess(true);
    setLoading(false);
  };

  const languageSwitcher = (
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
  );

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        {languageSwitcher}
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-foreground">{t("auth.signup.success.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("auth.signup.success.desc", { email })}
          </p>
          <Link
            href="/auth/login"
            className="text-sm text-primary font-medium hover:underline"
          >
            {t("auth.signup.success.backToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {languageSwitcher}
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
            {t("auth.signup.subtitle")}
          </p>
        </div>

        {/* Google sign-up */}
        <GoogleSignInButton label={t("auth.google")} />

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs text-muted-foreground">
            <span className="bg-background px-2">{t("auth.signup.orEmail")}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("auth.signup.email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">{t("auth.signup.password")}</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">{t("auth.signup.confirmPassword")}</Label>
            <Input
              id="confirm"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
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
                {t("auth.signup.submitting")}
              </>
            ) : (
              t("auth.signup.submit")
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("auth.signup.hasAccount")}{" "}
          <Link
            href="/auth/login"
            className="text-primary font-medium hover:underline"
          >
            {t("auth.signup.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
