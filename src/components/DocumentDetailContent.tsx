"use client";

import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  File,
  Presentation,
  FileImage,
  Image,
  CheckCircle,
  Clock,
  AlertCircle,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import SummaryPanel from "@/components/SummaryPanel";
import FlashcardViewer from "@/components/FlashcardViewer";
import QuizInterface from "@/components/QuizInterface";
import ChatInterface from "@/components/ChatInterface";
import type { Document, Summary, Flashcard, Quiz } from "@/lib/supabase/types";
import type { Message } from "ai";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";
import { useParallelGenerate } from "@/hooks/useParallelGenerate";

const fileIcons = {
  pdf: { icon: FileText, color: "text-red-500 dark:text-red-400 bg-red-500/10" },
  docx: { icon: File, color: "text-blue-500 dark:text-blue-400 bg-blue-500/10" },
  pptx: { icon: Presentation, color: "text-orange-500 dark:text-orange-400 bg-orange-500/10" },
  txt: { icon: FileImage, color: "text-gray-500 dark:text-gray-400 bg-gray-500/10" },
  png: { icon: Image, color: "text-violet-500 dark:text-violet-400 bg-violet-500/10" },
  jpg: { icon: Image, color: "text-violet-500 dark:text-violet-400 bg-violet-500/10" },
  jpeg: { icon: Image, color: "text-violet-500 dark:text-violet-400 bg-violet-500/10" },
};

interface DocumentDetailContentProps {
  doc: Document;
  summary: Summary | null;
  flashcards: Flashcard[];
  quiz: Quiz | null;
  initialMessages?: Message[];
}

export default function DocumentDetailContent({
  doc,
  summary,
  flashcards,
  quiz,
  initialMessages,
}: DocumentDetailContentProps) {
  const { t, locale } = useLanguage();

  const generate = useParallelGenerate({
    documentId: doc.id,
    locale,
    initialSummary: summary,
    initialFlashcards: flashcards,
    initialQuiz: quiz,
  });

  const statusConfig = {
    ready: {
      label: t("document.status.ready"),
      icon: CheckCircle,
      class: "bg-emerald-500/10 text-emerald-700 border-emerald-500/25 dark:text-emerald-400 dark:border-emerald-500/30",
    },
    processing: {
      label: t("document.status.processing"),
      icon: Clock,
      class: "bg-amber-500/10 text-amber-700 border-amber-500/25 dark:text-amber-400 dark:border-amber-500/30",
    },
    error: {
      label: t("document.status.error"),
      icon: AlertCircle,
      class: "bg-red-500/10 text-red-700 border-red-500/25 dark:text-red-400 dark:border-red-500/30",
    },
  };

  const fileConfig =
    fileIcons[doc.file_type as keyof typeof fileIcons] ?? fileIcons.txt;
  const status =
    statusConfig[doc.status as keyof typeof statusConfig] ??
    statusConfig.error;
  const FileIcon = fileConfig.icon;
  const StatusIcon = status.icon;
  const isReady = doc.status === "ready";

  const dateLocale = locale === "sq" ? "sq-AL" : "en-US";
  const formattedDate = new Date(doc.created_at).toLocaleDateString(
    dateLocale,
    { month: "long", day: "numeric", year: "numeric" }
  );

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-4xl">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<Link href="/documents" />}
        className="mb-6 -ml-2 gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("document.back")}
      </Button>

      {/* Document header */}
      <Card className="shadow-none border-border/60 mb-6">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className={cn("p-3 rounded-xl shrink-0", fileConfig.color)}>
              <FileIcon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">
                {doc.name}
              </h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn("text-xs border", status.class)}
                >
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {status.label}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {doc.file_type.toUpperCase()}
                </Badge>
                {doc.chunk_count > 0 && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Hash className="w-3 h-3" />
                    {t("document.chunksIndexed", { n: doc.chunk_count })}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {t("document.added", { date: formattedDate })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing state */}
      {doc.status === "processing" && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-4 mb-6 flex items-center gap-3">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            {t("document.processing.message")}
          </p>
        </div>
      )}

      {doc.status === "error" && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/25 p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-sm text-red-800 dark:text-red-300">
            {t("document.error.message")}
          </p>
        </div>
      )}

      {/* Tabs */}
      {isReady && (
        <Tabs defaultValue="summary">
          <TabsList className="mb-6 h-10">
            <TabsTrigger value="summary" className="text-sm">
              {t("document.tab.summary")}
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="text-sm">
              {t("document.tab.flashcards")}
              {(generate.flashcards.data?.length ?? 0) > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1.5 text-xs h-4 px-1.5"
                >
                  {generate.flashcards.data!.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="quiz" className="text-sm">
              {t("document.tab.quiz")}
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-sm">
              {t("document.tab.chat")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <Card className="shadow-none border-border/60">
              <CardContent className="p-4 md:p-6">
                <SummaryPanel
                  summary={generate.summary.data}
                  isLoading={generate.summary.isLoading}
                  timedOut={generate.summary.timedOut}
                  onRegenerate={generate.summary.startGenerate}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flashcards">
            <Card className="shadow-none border-border/60">
              <CardContent className="p-4 md:p-6">
                <FlashcardViewer
                  cards={generate.flashcards.data ?? []}
                  isLoading={generate.flashcards.isLoading}
                  timedOut={generate.flashcards.timedOut}
                  onRegenerate={generate.flashcards.startGenerate}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quiz">
            <Card className="shadow-none border-border/60">
              <CardContent className="p-4 md:p-6">
                <QuizInterface
                  quiz={generate.quiz.data}
                  isLoading={generate.quiz.isLoading}
                  timedOut={generate.quiz.timedOut}
                  onRegenerate={generate.quiz.startGenerate}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat" keepMounted>
            <Card className="shadow-none border-border/60">
              <CardContent className="p-4 md:p-6">
                <ChatInterface documentId={doc.id} initialMessages={initialMessages} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
