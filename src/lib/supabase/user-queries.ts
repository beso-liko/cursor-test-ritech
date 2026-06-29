import { createAdminClient } from "@/lib/supabase/server";
import type { Document } from "@/lib/supabase/types";

export function adminForUser(supabaseUserId: string) {
  return { admin: createAdminClient(), supabaseUserId };
}

export async function getUserStats(supabaseUserId: string) {
  const admin = createAdminClient();

  const [{ count: totalDocs }, { data: userDocs }, { data: userGroups }] =
    await Promise.all([
      admin
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", supabaseUserId),
      admin.from("documents").select("id").eq("user_id", supabaseUserId),
      admin.from("document_groups").select("id").eq("user_id", supabaseUserId),
    ]);

  const docIds = (userDocs ?? []).map((d) => d.id);
  const groupIds = (userGroups ?? []).map((g) => g.id);

  let totalFlashcards = 0;
  let totalQuizzes = 0;

  if (docIds.length > 0) {
    const { count } = await admin
      .from("flashcards")
      .select("*", { count: "exact", head: true })
      .in("document_id", docIds);
    totalFlashcards += count ?? 0;

    const { count: quizCount } = await admin
      .from("quizzes")
      .select("*", { count: "exact", head: true })
      .in("document_id", docIds);
    totalQuizzes += quizCount ?? 0;
  }

  if (groupIds.length > 0) {
    const { count } = await admin
      .from("flashcards")
      .select("*", { count: "exact", head: true })
      .in("group_id", groupIds);
    totalFlashcards += count ?? 0;

    const { count: quizCount } = await admin
      .from("quizzes")
      .select("*", { count: "exact", head: true })
      .in("group_id", groupIds);
    totalQuizzes += quizCount ?? 0;
  }

  const { count: quizzesTaken } = await admin
    .from("quiz_results")
    .select("*", { count: "exact", head: true })
    .eq("user_id", supabaseUserId);

  return {
    totalDocuments: totalDocs ?? 0,
    totalFlashcards,
    totalQuizzes,
    quizzesTaken: quizzesTaken ?? 0,
  };
}

export async function getRecentDocuments(
  supabaseUserId: string,
  limit = 6
): Promise<Document[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("documents")
    .select("*")
    .eq("user_id", supabaseUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data as Document[]) ?? [];
}

/** Verify a document belongs to the user; returns the row or null. */
export async function getOwnedDocument(
  supabaseUserId: string,
  documentId: string
) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .eq("user_id", supabaseUserId)
    .maybeSingle();

  return data;
}

/** Verify a folder belongs to the user; returns the row or null. */
export async function getOwnedGroup(supabaseUserId: string, groupId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("document_groups")
    .select("*")
    .eq("id", groupId)
    .eq("user_id", supabaseUserId)
    .maybeSingle();

  return data;
}
