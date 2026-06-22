import { notFound } from "next/navigation";
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
import AppShell from "@/components/AppShell";
import SummaryPanel from "@/components/SummaryPanel";
import FlashcardViewer from "@/components/FlashcardViewer";
import QuizInterface from "@/components/QuizInterface";
import ChatInterface from "@/components/ChatInterface";
import { createServerClient } from "@/lib/supabase/server";
import type { Document, Summary, Flashcard, Quiz } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const fileIcons = {
  pdf: { icon: FileText, color: "text-red-500 bg-red-50" },
  docx: { icon: File, color: "text-blue-500 bg-blue-50" },
  pptx: { icon: Presentation, color: "text-orange-500 bg-orange-50" },
  txt: { icon: FileImage, color: "text-gray-500 bg-gray-50" },
  png: { icon: Image, color: "text-violet-500 bg-violet-50" },
  jpg: { icon: Image, color: "text-violet-500 bg-violet-50" },
  jpeg: { icon: Image, color: "text-violet-500 bg-violet-50" },
};

const statusConfig = {
  ready: {
    label: "Ready",
    icon: CheckCircle,
    class: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  processing: {
    label: "Processing",
    icon: Clock,
    class: "bg-amber-50 text-amber-700 border-amber-200",
  },
  error: {
    label: "Error",
    icon: AlertCircle,
    class: "bg-red-50 text-red-700 border-red-200",
  },
};

async function getDocumentData(id: string) {
  const supabase = createServerClient();

  const [
    { data: doc },
    { data: summary },
    { data: flashcards },
    { data: quiz },
  ] = await Promise.all([
    supabase.from("documents").select("*").eq("id", id).single(),
    supabase.from("summaries").select("*").eq("document_id", id).single(),
    supabase.from("flashcards").select("*").eq("document_id", id),
    supabase.from("quizzes").select("*").eq("document_id", id).single(),
  ]);

  return {
    doc: doc as Document | null,
    summary: summary as Summary | null,
    flashcards: (flashcards as Flashcard[]) ?? [],
    quiz: quiz as Quiz | null,
  };
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { doc, summary, flashcards, quiz } = await getDocumentData(id);

  if (!doc) notFound();

  const fileConfig =
    fileIcons[doc.file_type as keyof typeof fileIcons] ?? fileIcons.txt;
  const status = statusConfig[doc.status as keyof typeof statusConfig] ?? statusConfig.error;
  const FileIcon = fileConfig.icon;
  const StatusIcon = status.icon;
  const isReady = doc.status === "ready";

  const formattedDate = new Date(doc.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <AppShell>
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
          All documents
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
                      {doc.chunk_count} chunks indexed
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Added {formattedDate}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Processing state */}
        {doc.status === "processing" && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-6 flex items-center gap-3">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              This document is being processed. Please refresh in a moment.
            </p>
          </div>
        )}

        {doc.status === "error" && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <p className="text-sm text-red-800">
              Failed to process this document. Please try uploading again.
            </p>
          </div>
        )}

        {/* Tabs */}
        {isReady && (
          <Tabs defaultValue="summary">
            <TabsList className="mb-6 h-10">
              <TabsTrigger value="summary" className="text-sm">
                Summary
              </TabsTrigger>
              <TabsTrigger value="flashcards" className="text-sm">
                Flashcards
                {flashcards.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1.5 text-xs h-4 px-1.5"
                  >
                    {flashcards.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="quiz" className="text-sm">
                Quiz
              </TabsTrigger>
              <TabsTrigger value="chat" className="text-sm">
                Chat
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              <Card className="shadow-none border-border/60">
                <CardContent className="p-6">
                  <SummaryPanel documentId={doc.id} initialData={summary} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="flashcards">
              <Card className="shadow-none border-border/60">
                <CardContent className="p-6">
                  <FlashcardViewer
                    documentId={doc.id}
                    initialCards={flashcards}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="quiz">
              <Card className="shadow-none border-border/60">
                <CardContent className="p-6">
                  <QuizInterface documentId={doc.id} initialQuiz={quiz} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="chat">
              <Card className="shadow-none border-border/60">
                <CardContent className="p-6">
                  <ChatInterface documentId={doc.id} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppShell>
  );
}
