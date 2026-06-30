"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  LayoutDashboard,
  FileText,
  Upload,
  Sparkles,
  Brain,
  Zap,
  GraduationCap,
  Settings,
  Sun,
  Moon,
  X,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";
import { useTheme } from "@/components/ThemeProvider";
import AuthControls from "@/components/AuthControls";
import { marketingContactUrl } from "@/lib/site-links";

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { t, locale, setLocale } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { user } = useUser();

  const displayName =
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    null;

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
      label: t("sidebar.nav.account"),
      icon: Settings,
      description: t("sidebar.nav.account.desc"),
    },
    {
      href: marketingContactUrl(),
      label: t("sidebar.nav.contact"),
      icon: Mail,
      description: t("sidebar.nav.contact.desc"),
      external: true,
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
          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-[15px] leading-tight text-foreground tracking-tight">
              {t("sidebar.brand")}
            </p>
            <p className="text-[11px] text-muted-foreground leading-tight font-medium">
              {t("sidebar.tagline")}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-4 space-y-0.5">
        <p className="text-xs font-semibold text-muted-foreground px-3 mb-2 uppercase tracking-widest">
          {t("sidebar.nav.label")}
        </p>
        {navItems.map(({ href, label, icon: Icon, description, external }) => {
          const active =
            !external &&
            (href === "/" ? pathname === "/" : pathname.startsWith(href));
          const className = cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
            active
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          );

          const content = (
            <>
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
                      ? "text-primary-foreground/90"
                      : "text-muted-foreground"
                  )}
                >
                  {description}
                </p>
              </div>
            </>
          );

          if (external) {
            return (
              <a
                key={href}
                href={href}
                onClick={onClose}
                className={className}
              >
                {content}
              </a>
            );
          }

          return (
            <Link key={href} href={href} onClick={onClose} className={className}>
              {content}
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

      {/* Theme toggle */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-1 rounded-xl bg-muted/50 p-1">
          <button
            onClick={() => setTheme("light")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg transition-all",
              theme === "light"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sun className="w-3 h-3" />
            {t("sidebar.theme.light")}
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg transition-all",
              theme === "dark"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Moon className="w-3 h-3" />
            {t("sidebar.theme.dark")}
          </button>
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
                ? "bg-primary text-primary-foreground shadow-sm"
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
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            SQ
          </button>
        </div>
      </div>

      {/* User account */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-1 min-w-0">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">
            {displayName ?? t("sidebar.footer")}
          </span>
          <AuthControls />
        </div>
      </div>
    </aside>
  );
}
