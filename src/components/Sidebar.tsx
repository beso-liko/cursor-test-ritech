"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Upload,
  Sparkles,
  Brain,
  Zap,
  GraduationCap,
  LogOut,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";
import { createBrowserClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale, setLocale } = useLanguage();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });
    fetch("/api/account")
      .then((r) => r.json())
      .then((data) => {
        const first = data.first_name?.trim() ?? "";
        const last = data.last_name?.trim() ?? "";
        const full = [first, last].filter(Boolean).join(" ");
        setDisplayName(full || null);
      })
      .catch(() => {});
  }, []);

  const handleSignOut = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const navItems = [
    {
      href: "/",
      label: t("sidebar.nav.dashboard"),
      icon: LayoutDashboard,
      description: t("sidebar.nav.dashboard.desc"),
    },
    {
      href: "/documents",
      label: t("sidebar.nav.documents"),
      icon: FileText,
      description: t("sidebar.nav.documents.desc"),
    },
    {
      href: "/upload",
      label: t("sidebar.nav.upload"),
      icon: Upload,
      description: t("sidebar.nav.upload.desc"),
    },
    {
      href: "/account-settings",
      label: "Account Settings",
      icon: Settings,
      description: "Profile & security",
    },
  ];

  const features = [
    { icon: Brain, text: t("sidebar.features.summaries") },
    { icon: Zap, text: t("sidebar.features.flashcards") },
    { icon: Sparkles, text: t("sidebar.features.quizzes") },
  ];

  return (
    <aside className="w-64 shrink-0 flex flex-col h-screen sticky top-0 bg-sidebar border-r border-sidebar-border">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary via-primary to-orange-700 shadow-lg shadow-primary/40 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <p className="font-extrabold text-[15px] leading-tight text-foreground tracking-tight">
              {t("sidebar.brand")}
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight font-medium">
              {t("sidebar.tagline")}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-4 space-y-0.5">
        <p className="text-[10px] font-semibold text-muted-foreground px-3 mb-2 uppercase tracking-widest">
          {t("sidebar.nav.label")}
        </p>
        {navItems.map(({ href, label, icon: Icon, description }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                  active
                    ? "bg-primary-foreground/15"
                    : "bg-sidebar-accent group-hover:bg-sidebar-border"
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="leading-tight">{label}</p>
                <p
                  className={cn(
                    "text-[11px] leading-tight font-normal truncate",
                    active
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  )}
                >
                  {description}
                </p>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t border-sidebar-border" />

      {/* Features card */}
      <div className="px-4 py-4 flex-1">
        <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
          <p className="text-xs font-semibold text-foreground mb-3">
            {t("sidebar.features.label")}
          </p>
          <div className="space-y-2.5">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-3 h-3 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Language switcher */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-1 rounded-xl bg-muted/50 p-1">
          <button
            onClick={() => setLocale("en")}
            className={cn(
              "flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all",
              locale === "en"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            EN
          </button>
          <button
            onClick={() => setLocale("sq")}
            className={cn(
              "flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all",
              locale === "sq"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            SQ
          </button>
        </div>
      </div>

      {/* User + Sign out */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-1 min-w-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">
            {displayName ?? userEmail ?? t("sidebar.footer")}
          </span>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
