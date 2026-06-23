import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import GroupDetailContent from "@/components/GroupDetailContent";
import { createServerClient } from "@/lib/supabase/server";
import type {
  Document,
  DocumentGroup,
  Summary,
  Flashcard,
  Quiz,
} from "@/lib/supabase/types";

async function getGroupData(groupId: string) {
  const supabase = createServerClient();

  const [
    { data: group },
    { data: documents },
    { data: summary },
    { data: flashcards },
    { data: quiz },
  ] = await Promise.all([
    supabase.from("document_groups").select("*").eq("id", groupId).single(),
    supabase
      .from("documents")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true }),
    supabase.from("summaries").select("*").eq("group_id", groupId).single(),
    supabase.from("flashcards").select("*").eq("group_id", groupId),
    supabase.from("quizzes").select("*").eq("group_id", groupId).single(),
  ]);

  return {
    group: group as DocumentGroup | null,
    documents: (documents as Document[]) ?? [],
    summary: summary as Summary | null,
    flashcards: (flashcards as Flashcard[]) ?? [],
    quiz: quiz as Quiz | null,
  };
}

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { group, documents, summary, flashcards, quiz } =
    await getGroupData(groupId);

  if (!group) notFound();

  return (
    <AppShell>
      <GroupDetailContent
        group={group}
        documents={documents}
        summary={summary}
        flashcards={flashcards}
        quiz={quiz}
      />
    </AppShell>
  );
}
