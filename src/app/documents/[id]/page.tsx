import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import DocumentDetailContent from "@/components/DocumentDetailContent";
import { createAuthClient } from "@/lib/supabase/server";
import type { Document, Summary, Flashcard, Quiz } from "@/lib/supabase/types";
import type { Message } from "ai";

async function getDocumentData(id: string) {
  const supabase = await createAuthClient();

  const [
    { data: doc },
    { data: summary },
    { data: flashcards },
    { data: quiz },
    { data: chatSession },
  ] = await Promise.all([
    supabase.from("documents").select("*").eq("id", id).single(),
    supabase.from("summaries").select("*").eq("document_id", id).single(),
    supabase.from("flashcards").select("*").eq("document_id", id),
    supabase.from("quizzes").select("*").eq("document_id", id).single(),
    supabase.from("chat_sessions").select("messages").eq("document_id", id).single(),
  ]);

  return {
    doc: doc as Document | null,
    summary: summary as Summary | null,
    flashcards: (flashcards as Flashcard[]) ?? [],
    quiz: quiz as Quiz | null,
    initialMessages: (chatSession?.messages as Message[]) ?? [],
  };
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { doc, summary, flashcards, quiz, initialMessages } = await getDocumentData(id);

  if (!doc) notFound();

  return (
    <AppShell>
      <DocumentDetailContent
        doc={doc}
        summary={summary}
        flashcards={flashcards}
        quiz={quiz}
        initialMessages={initialMessages}
      />
    </AppShell>
  );
}
