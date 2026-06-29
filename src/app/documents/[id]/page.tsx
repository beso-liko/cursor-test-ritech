import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import DocumentDetailContent from "@/components/DocumentDetailContent";
import { getAppUser } from "@/lib/auth/app-user";
import { createAdminClient } from "@/lib/supabase/server";
import { getOwnedDocument } from "@/lib/supabase/user-queries";
import type { Document, Summary, Flashcard, Quiz } from "@/lib/supabase/types";
import type { Message } from "ai";

async function getDocumentData(id: string, supabaseUserId: string) {
  const doc = await getOwnedDocument(supabaseUserId, id);
  if (!doc) {
    return {
      doc: null,
      summary: null,
      flashcards: [],
      quiz: null,
      initialMessages: [],
    };
  }

  const admin = createAdminClient();
  const [
    { data: summary },
    { data: flashcards },
    { data: quiz },
    { data: chatSession },
  ] = await Promise.all([
    admin.from("summaries").select("*").eq("document_id", id).single(),
    admin.from("flashcards").select("*").eq("document_id", id),
    admin.from("quizzes").select("*").eq("document_id", id).single(),
    admin.from("chat_sessions").select("messages").eq("document_id", id).single(),
  ]);

  return {
    doc: doc as Document,
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
  const appUser = await getAppUser();
  if (!appUser) notFound();

  const { doc, summary, flashcards, quiz, initialMessages } = await getDocumentData(
    id,
    appUser.supabaseUserId
  );

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
