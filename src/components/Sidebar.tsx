"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Upload,
  Sparkles,
  Brain,
  Zap,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Overview & stats",
  },
  {
    href: "/documents",
    label: "Documents",
    icon: FileText,
    description: "Your study materials",
  },
  {
    href: "/upload",
    label: "Upload",
    icon: Upload,
    description: "Add new documents",
  },
];

const features = [
  { icon: Brain, text: "AI Summaries" },
  { icon: Zap, text: "Smart Flashcards" },
  { icon: Sparkles, text: "Auto Quizzes" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 flex flex-col h-screen sticky top-0 bg-sidebar border-r border-sidebar-border">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary via-primary to-orange-700 shadow-lg shadow-primary/40 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <p className="font-extrabold text-[15px] leading-tight text-foreground tracking-tight">StudyBuddy</p>
            <p className="text-[11px] text-muted-foreground leading-tight font-medium">AI-powered learning</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-4 space-y-0.5">
        <p className="text-[10px] font-semibold text-muted-foreground px-3 mb-2 uppercase tracking-widest">
          Navigation
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
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                active
                  ? "bg-primary-foreground/15"
                  : "bg-sidebar-accent group-hover:bg-sidebar-border"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="leading-tight">{label}</p>
                <p className={cn(
                  "text-[11px] leading-tight font-normal truncate",
                  active ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
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
          <p className="text-xs font-semibold text-foreground mb-3">What you can do</p>
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

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-xs text-muted-foreground">Powered by GPT-4o mini</span>
        </div>
      </div>
    </aside>
  );
}
