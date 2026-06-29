import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import GroupDetailContent from "@/components/GroupDetailContent";
import { getAppUser } from "@/lib/auth/app-user";
import { createAdminClient } from "@/lib/supabase/server";
import { getOwnedGroup } from "@/lib/supabase/user-queries";
import type {
  Document,
  DocumentGroup,
  Summary,
  Flashcard,
  Quiz,
} from "@/lib/supabase/types";
import type { Message } from "ai";

async function getGroupData(groupId: string, supabaseUserId: string) {
  const group = await getOwnedGroup(supabaseUserId, groupId);
  if (!group) {
    return {
      group: null,
      documents: [],
      summary: null,
      flashcards: [],
      quiz: null,
      initialMessages: [],
    };
  }

  const admin = createAdminClient();
  const [
    { data: documents },
    { data: summary },
    { data: flashcards },
    { data: quiz },
    { data: chatSession },
  ] = await Promise.all([
    admin
      .from("documents")
      .select("*")
      .eq("group_id", groupId)
      .eq("user_id", supabaseUserId)
      .order("created_at", { ascending: true }),
    admin.from("summaries").select("*").eq("group_id", groupId).single(),
    admin.from("flashcards").select("*").eq("group_id", groupId),
    admin.from("quizzes").select("*").eq("group_id", groupId).single(),
    admin.from("chat_sessions").select("messages").eq("group_id", groupId).single(),
  ]);

  return {
    group: group as DocumentGroup,
    documents: (documents as Document[]) ?? [],
    summary: summary as Summary | null,
    flashcards: (flashcards as Flashcard[]) ?? [],
    quiz: quiz as Quiz | null,
    initialMessages: (chatSession?.messages as Message[]) ?? [],
  };
}

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const appUser = await getAppUser();
  if (!appUser) notFound();

  const { group, documents, summary, flashcards, quiz, initialMessages } =
    await getGroupData(groupId, appUser.supabaseUserId);

  if (!group) notFound();

  return (
    <AppShell>
      <GroupDetailContent
        group={group}
        documents={documents}
        summary={summary}
        flashcards={flashcards}
        quiz={quiz}
        initialMessages={initialMessages}
      />
    </AppShell>
  );
}
