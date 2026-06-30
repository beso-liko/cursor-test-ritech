"use client";

import { useState } from "react";
import { GraduationCap, Menu } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import AuthControls from "@/components/AuthControls";
import LegalFooterLinks from "@/components/LegalFooterLinks";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — fixed drawer on mobile/tablet, always-visible column on lg+ */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out",
          "lg:relative lg:z-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar onClose={() => setOpen(false)} />
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile/tablet top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background px-4 shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="text-foreground p-1 -ml-1"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary to-orange-700 flex items-center justify-center shrink-0 shadow-sm shadow-primary/40">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-sm text-foreground tracking-tight truncate">
              {t("sidebar.brand")}
            </span>
          </div>
          <AuthControls />
        </header>

        <main className="flex-1 overflow-auto">
          {children}
          <LegalFooterLinks />
        </main>
      </div>
    </div>
  );
}
