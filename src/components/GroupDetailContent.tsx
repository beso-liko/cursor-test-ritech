"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
  MoreHorizontal,
  Trash2,
  FolderMinus,
  Loader2,
} from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import SummaryPanel from "@/components/SummaryPanel";
import FlashcardViewer from "@/components/FlashcardViewer";
import QuizInterface from "@/components/QuizInterface";
import ChatInterface from "@/components/ChatInterface";
import GenerationFocusControls from "@/components/GenerationFocusControls";
import type {
  Document,
  DocumentGroup,
  Summary,
  Flashcard,
  Quiz,
} from "@/lib/supabase/types";
import type { Message } from "ai";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";
import { useParallelGenerate } from "@/hooks/useParallelGenerate";
import { useGenerationFocus } from "@/hooks/useGenerationFocus";
import { parseStoredGenerationFocus } from "@/lib/generation/focus";

const fileIcons = {
  pdf: { icon: FileText, color: "text-red-500 dark:text-red-400 bg-red-500/10" },
  docx: { icon: File, color: "text-blue-500 dark:text-blue-400 bg-blue-500/10" },
  pptx: { icon: Presentation, color: "text-orange-500 dark:text-orange-400 bg-orange-500/10" },
  txt: { icon: FileImage, color: "text-gray-500 dark:text-gray-400 bg-gray-500/10" },
  png: { icon: Image, color: "text-violet-500 dark:text-violet-400 bg-violet-500/10" },
  jpg: { icon: Image, color: "text-violet-500 dark:text-violet-400 bg-violet-500/10" },
  jpeg: { icon: Image, color: "text-violet-500 dark:text-violet-400 bg-violet-500/10" },
};

interface GroupDetailContentProps {
  group: DocumentGroup;
  documents: Document[];
  summary: Summary | null;
  flashcards: Flashcard[];
  quiz: Quiz | null;
  initialMessages?: Message[];
}

export default function GroupDetailContent({
  group,
  documents: initialDocuments,
  summary,
  flashcards,
  quiz,
  initialMessages,
}: GroupDetailContentProps) {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const [documents, setDocuments] = useState(initialDocuments);
  const [actionDocId, setActionDocId] = useState<string | null>(null);
  const [contentVersion, setContentVersion] = useState(0);

  const storedFocus = parseStoredGenerationFocus(summary);
  const offTopicHandlerRef = useRef<() => void>(() => {});

  const generate = useParallelGenerate({
    groupId: group.id,
    locale,
    initialSummary: summary,
    initialFlashcards: flashcards,
    initialQuiz: quiz,
    autoStart: false,
    initialFocus: storedFocus,
    onOffTopic: () => offTopicHandlerRef.current(),
  });

  const focusControls = useGenerationFocus({
    isReady: documents.some((doc) => doc.status === "ready"),
    isGroup: true,
    initialSummary: summary,
    initialFlashcards: flashcards,
    initialQuiz: quiz,
    generate,
    onFocusApplied: () => setContentVersion((version) => version + 1),
    registerOffTopicHandler: (handler) => {
      offTopicHandlerRef.current = handler;
    },
  });

  const maybeRegenerateMaterials = (nextDocuments: Document[]) => {
    const hasReady = nextDocuments.some((doc) => doc.status === "ready");
    generate.clearGeneratedContent();
    setContentVersion((version) => version + 1);
    if (hasReady) {
      generate.regenerateAll({
        focus: generate.focus,
        regenerate: true,
      });
    }
  };

  const handleRemoveFromFolder = async (docId: string) => {
    if (!confirm(t("group.removeFromFolder.confirm"))) return;

    setActionDocId(docId);
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: null }),
      });

      if (!res.ok) return;

      const data = await res.json();

      const nextDocuments = documents.filter((doc) => doc.id !== docId);
      setDocuments(nextDocuments);
      if (data.invalidatedGroupId) {
        maybeRegenerateMaterials(nextDocuments);
      }
    } finally {
      setActionDocId(null);
    }
  };

  const handleDeleteFile = async (docId: string) => {
    if (!confirm(t("group.deleteFile.confirm"))) return;

    setActionDocId(docId);
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) return;

      const data = await res.json();

      const nextDocuments = documents.filter((doc) => doc.id !== docId);
      setDocuments(nextDocuments);
      if (data.invalidatedGroupId) {
        maybeRegenerateMaterials(nextDocuments);
      }
    } finally {
      setActionDocId(null);
    }
  };

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

  const regenerateOverride = generate.focus
    ? { focus: generate.focus, regenerate: true }
    : { regenerate: true };

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
                    totalCount === 0
                      ? "bg-muted/50 text-muted-foreground border-border/60"
                      : allReady
                      ? statusConfig.ready.class
                      : anyProcessing
                      ? statusConfig.processing.class
                      : statusConfig.error.class
                  )}
                >
                  {totalCount === 0 ? (
                    <Files className="w-3 h-3 mr-1" />
                  ) : allReady ? (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  ) : anyProcessing ? (
                    <Clock className="w-3 h-3 mr-1" />
                  ) : (
                    <AlertCircle className="w-3 h-3 mr-1" />
                  )}
                  {totalCount === 0
                    ? t("folder.docs.other", { n: 0 })
                    : allReady
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
        {documents.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            {t("group.empty")}
          </p>
        ) : (
          documents.map((doc) => {
          const fileConfig =
            fileIcons[doc.file_type as keyof typeof fileIcons] ?? fileIcons.txt;
          const FileIcon = fileConfig.icon;
          const status = statusConfig[doc.status as keyof typeof statusConfig] ?? statusConfig.error;
          const StatusIcon = status.icon;
          const isActionPending = actionDocId === doc.id;

          return (
            <div
              key={doc.id}
              className="group flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card"
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
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  render={<Link href={`/documents/${doc.id}`} />}
                  className="text-xs text-muted-foreground hidden sm:inline-flex"
                >
                  {t("group.viewDoc")}
                </Button>

                <Menu.Root>
                  <Menu.Trigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        disabled={isActionPending}
                        aria-label={t("group.fileActions")}
                      />
                    }
                  >
                    {isActionPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    )}
                  </Menu.Trigger>
                  <Menu.Portal>
                    <Menu.Positioner sideOffset={4} align="end">
                      <Menu.Popup
                        className={cn(
                          "z-50 min-w-[200px] origin-[var(--transform-origin)] rounded-xl border border-border bg-popover p-1 shadow-md outline-none",
                          "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
                          "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
                        )}
                      >
                        <Menu.Item
                          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-foreground cursor-pointer select-none outline-none data-highlighted:bg-accent sm:hidden"
                          onClick={() => router.push(`/documents/${doc.id}`)}
                        >
                          {t("group.viewDoc")}
                        </Menu.Item>
                        <Menu.Item
                          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-foreground cursor-pointer select-none outline-none data-highlighted:bg-accent"
                          onClick={() => handleRemoveFromFolder(doc.id)}
                        >
                          <FolderMinus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          {t("group.removeFromFolder")}
                        </Menu.Item>
                        <div className="my-1 h-px bg-border mx-1" />
                        <Menu.Item
                          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-destructive cursor-pointer select-none outline-none data-highlighted:bg-destructive/10"
                          onClick={() => handleDeleteFile(doc.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          {t("group.deleteFile")}
                        </Menu.Item>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
              </div>
            </div>
          );
        })
        )}
      </div>

      {/* Processing state */}
      {anyProcessing && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-4 mb-6 flex items-center gap-3">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-300">{t("document.processing.message")}</p>
        </div>
      )}

      {/* AI Tabs — only if at least one document is ready */}
      {readyCount > 0 && (
        <>
          <GenerationFocusControls groupId={group.id} controls={focusControls} />

          <Tabs defaultValue="summary">
          <TabsList className="mb-6 h-10">
            <TabsTrigger value="summary" className="text-sm">
              {t("document.tab.summary")}
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="text-sm">
              {t("document.tab.flashcards")}
              {(generate.flashcards.data?.length ?? 0) > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs h-4 px-1.5">
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
                  onRegenerate={() => generate.summary.startGenerate(regenerateOverride)}
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
                  onRegenerate={() =>
                    generate.flashcards.startGenerate(regenerateOverride)
                  }
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
                  onRegenerate={() => generate.quiz.startGenerate(regenerateOverride)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat" keepMounted>
            <Card className="shadow-none border-border/60">
              <CardContent className="p-4 md:p-6">
                <ChatInterface
                  key={contentVersion}
                  groupId={group.id}
                  generationFocus={focusControls.activeFocus}
                  initialMessages={contentVersion === 0 ? initialMessages : undefined}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </>
      )}
    </div>
  );
}
