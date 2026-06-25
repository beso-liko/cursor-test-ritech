"use client";

import {
  FileText,
  Layers,
  ClipboardList,
  Trophy,
  ArrowRight,
  Upload,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/StatsCard";
import DocumentCard from "@/components/DocumentCard";
import type { Document } from "@/lib/supabase/types";
import { useLanguage } from "@/components/LanguageProvider";

interface DashboardContentProps {
  stats: {
    totalDocuments: number;
    totalFlashcards: number;
    totalQuizzes: number;
    quizzesTaken: number;
  };
  recentDocs: Document[];
  firstName?: string | null;
}

export default function DashboardContent({
  stats,
  recentDocs,
  firstName,
}: DashboardContentProps) {
  const { t } = useLanguage();

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          {firstName && (
            <p className="text-sm font-medium text-primary mb-1">
              {t("dashboard.welcome", { name: firstName })}
            </p>
          )}
          <h1 className="text-2xl font-bold text-foreground">
            {t("dashboard.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("dashboard.subtitle")}
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/upload" />} className="gap-2">
          <Upload className="w-4 h-4" />
          {t("dashboard.upload")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatsCard
          title={t("dashboard.stats.documents")}
          value={stats.totalDocuments}
          icon={FileText}
          description={t("dashboard.stats.documents.desc")}
          color="indigo"
        />
        <StatsCard
          title={t("dashboard.stats.flashcards")}
          value={stats.totalFlashcards}
          icon={Layers}
          description={t("dashboard.stats.flashcards.desc")}
          color="emerald"
        />
        <StatsCard
          title={t("dashboard.stats.quizzes")}
          value={stats.totalQuizzes}
          icon={ClipboardList}
          description={t("dashboard.stats.quizzes.desc")}
          color="amber"
        />
        <StatsCard
          title={t("dashboard.stats.attempts")}
          value={stats.quizzesTaken}
          icon={Trophy}
          description={t("dashboard.stats.attempts.desc")}
          color="rose"
        />
      </div>

      {/* Recent documents */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">
            {t("dashboard.recent")}
          </h2>
          {recentDocs.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/documents" />}
              className="gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              {t("dashboard.viewAll")} <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {recentDocs.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <BookOpen className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">
              {t("dashboard.empty.title")}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              {t("dashboard.empty.desc")}
            </p>
            <Button nativeButton={false} render={<Link href="/upload" />} className="mt-4 gap-2">
              <Upload className="w-4 h-4" />
              {t("dashboard.empty.cta")}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentDocs.map((doc) => (
              <DocumentCard key={doc.id} document={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
