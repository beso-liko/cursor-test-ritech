"use client";

import { Loader2, Sparkles, BookOpen, List, Tag, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/components/LanguageProvider";
import type { Summary } from "@/lib/supabase/types";

interface ParsedSummary {
  summary: string;
  keyPoints: string[];
  topics: string[];
}

function parseSummaryContent(content: string): ParsedSummary {
  try {
    return JSON.parse(content);
  } catch {
    return { summary: content, keyPoints: [], topics: [] };
  }
}

interface SummaryPanelProps {
  summary: Summary | null;
  isLoading: boolean;
  timedOut: boolean;
  onRegenerate: () => void;
}

export default function SummaryPanel({
  summary,
  isLoading,
  timedOut,
  onRegenerate,
}: SummaryPanelProps) {
  const { t } = useLanguage();

  if (isLoading && !summary) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t("summary.generating")}</span>
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="h-24 w-full mt-4" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <BookOpen className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">
            {t("summary.empty.title")}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            {t("summary.empty.desc")}
          </p>
        </div>
        {timedOut && (
          <Button onClick={onRegenerate} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            {t("summary.generate")}
          </Button>
        )}
      </div>
    );
  }

  const parsed = parseSummaryContent(summary.content);

  return (
    <div className="space-y-6">
      {/* Summary text */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">
            {t("summary.title")}
          </h3>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed bg-accent/30 rounded-xl p-4">
          {parsed.summary}
        </p>
      </div>

      {/* Key points */}
      {parsed.keyPoints.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <List className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">
              {t("summary.keyPoints")}
            </h3>
          </div>
          <ul className="space-y-2">
            {parsed.keyPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-foreground/80">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Topics */}
      {parsed.topics.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">
              {t("summary.topics")}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {parsed.topics.map((topic) => (
              <Badge key={topic} variant="secondary" className="text-xs">
                {topic}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Regenerate */}
      <div className="pt-2 border-t border-border/40">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground text-xs"
          onClick={onRegenerate}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          {t("summary.generate")}
        </Button>
      </div>
    </div>
  );
}
