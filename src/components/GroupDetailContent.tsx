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
  Files,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import SummaryPanel from "@/components/SummaryPanel";
import FlashcardViewer from "@/components/FlashcardViewer";
import QuizInterface from "@/components/QuizInterface";
import ChatInterface from "@/components/ChatInterface";
import type {
  Document,
  DocumentGroup,
  Summary,
  Flashcard,
  Quiz,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";

const fileIcons = {
  pdf: { icon: FileText, color: "text-red-500 bg-red-50" },
  docx: { icon: File, color: "text-blue-500 bg-blue-50" },
  pptx: { icon: Presentation, color: "text-orange-500 bg-orange-50" },
  txt: { icon: FileImage, color: "text-gray-500 bg-gray-50" },
  png: { icon: Image, color: "text-violet-500 bg-violet-50" },
  jpg: { icon: Image, color: "text-violet-500 bg-violet-50" },
  jpeg: { icon: Image, color: "text-violet-500 bg-violet-50" },
};

interface GroupDetailContentProps {
  group: DocumentGroup;
  documents: Document[];
  summary: Summary | null;
  flashcards: Flashcard[];
  quiz: Quiz | null;
}

export default function GroupDetailContent({
  group,
  documents,
  summary,
  flashcards,
  quiz,
}: GroupDetailContentProps) {
  const { t, locale } = useLanguage();

  const statusConfig = {
    ready: {
      label: t("document.status.ready"),
      icon: CheckCircle,
      class: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    processing: {
      label: t("document.status.processing"),
      icon: Clock,
      class: "bg-amber-50 text-amber-700 border-amber-200",
    },
    error: {
      label: t("document.status.error"),
      icon: AlertCircle,
      class: "bg-red-50 text-red-700 border-red-200",
    },
  };

  const readyCount = documents.filter((d) => d.status === "ready").length;
  const totalCount = documents.length;
  const allReady = readyCount === totalCount && totalCount > 0;
  const anyProcessing = documents.some((d) => d.status === "processing");

  const dateLocale = locale === "sq" ? "sq-AL" : "en-US";
  const formattedDate = new Date(group.created_at).toLocaleDateString(dateLocale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="px-8 py-8 max-w-4xl">
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

      {/* Group header */}
      <Card className="shadow-none border-border/60 mb-4">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl shrink-0 bg-primary/10">
              <Files className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-foreground">
                {t("group.title", { n: totalCount })}
              </h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs border",
                    allReady
                      ? statusConfig.ready.class
                      : anyProcessing
                      ? statusConfig.processing.class
                      : statusConfig.error.class
                  )}
                >
                  {allReady ? (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  ) : anyProcessing ? (
                    <Clock className="w-3 h-3 mr-1" />
                  ) : (
                    <AlertCircle className="w-3 h-3 mr-1" />
                  )}
                  {allReady
                    ? t("document.status.ready")
                    : anyProcessing
                    ? t("document.status.processing")
                    : t("document.status.error")}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {t("document.added", { date: formattedDate })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document list */}
      <div className="mb-6 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          {t("group.files")}
        </p>
        {documents.map((doc) => {
          const fileConfig =
            fileIcons[doc.file_type as keyof typeof fileIcons] ?? fileIcons.txt;
          const FileIcon = fileConfig.icon;
          const status = statusConfig[doc.status as keyof typeof statusConfig] ?? statusConfig.error;
          const StatusIcon = status.icon;

          return (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card"
            >
              <div className={cn("p-2 rounded-lg shrink-0", fileConfig.color)}>
                <FileIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge
                    variant="outline"
                    className={cn("text-xs border h-4 px-1.5", status.class)}
                  >
                    <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                    {status.label}
                  </Badge>
                  {doc.chunk_count > 0 && (
                    <Badge variant="outline" className="text-xs h-4 px-1.5 gap-0.5">
                      <Hash className="w-2.5 h-2.5" />
                      {doc.chunk_count}
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link href={`/documents/${doc.id}`} />}
                className="text-xs text-muted-foreground shrink-0"
              >
                {t("group.viewDoc")}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Processing state */}
      {anyProcessing && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-6 flex items-center gap-3">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">{t("document.processing.message")}</p>
        </div>
      )}

      {/* AI Tabs — only if at least one document is ready */}
      {readyCount > 0 && (
        <Tabs defaultValue="summary">
          <TabsList className="mb-6 h-10">
            <TabsTrigger value="summary" className="text-sm">
              {t("document.tab.summary")}
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="text-sm">
              {t("document.tab.flashcards")}
              {flashcards.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs h-4 px-1.5">
                  {flashcards.length}
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
              <CardContent className="p-6">
                <SummaryPanel groupId={group.id} initialData={summary} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="flashcards">
            <Card className="shadow-none border-border/60">
              <CardContent className="p-6">
                <FlashcardViewer groupId={group.id} initialCards={flashcards} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quiz">
            <Card className="shadow-none border-border/60">
              <CardContent className="p-6">
                <QuizInterface groupId={group.id} initialQuiz={quiz} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat">
            <Card className="shadow-none border-border/60">
              <CardContent className="p-6">
                <ChatInterface groupId={group.id} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
