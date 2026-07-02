import { deleteDocumentVectors } from "@/lib/langchain/embedder";
import { createAdminClient } from "@/lib/supabase/server";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function clearGroupGeneratedContent(
  admin: AdminClient,
  groupId: string
): Promise<void> {
  await Promise.all([
    admin.from("summaries").delete().eq("group_id", groupId),
    admin.from("flashcards").delete().eq("group_id", groupId),
    admin.from("quizzes").delete().eq("group_id", groupId),
    admin.from("chat_sessions").delete().eq("group_id", groupId),
  ]);
}

export async function clearDocumentGeneratedContent(
  admin: AdminClient,
  documentId: string
): Promise<void> {
  await Promise.all([
    admin.from("summaries").delete().eq("document_id", documentId),
    admin.from("flashcards").delete().eq("document_id", documentId),
    admin.from("quizzes").delete().eq("document_id", documentId),
    admin.from("chat_sessions").delete().eq("document_id", documentId),
  ]);
}

export async function deleteDocumentRecord(
  admin: AdminClient,
  doc: { id: string; file_url: string | null }
): Promise<void> {
  await deleteDocumentVectors(doc.id).catch(console.error);

  if (doc.file_url) {
    const path = doc.file_url.split("/").slice(-1)[0];
    if (path) {
      await admin.storage.from("documents").remove([path]);
    }
  }

  const { error } = await admin.from("documents").delete().eq("id", doc.id);
  if (error) throw error;
}

export async function deleteAllDocumentsInGroup(
  admin: AdminClient,
  groupId: string,
  userId: string
): Promise<void> {
  const { data: documents, error } = await admin
    .from("documents")
    .select("id, file_url")
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) throw error;

  for (const doc of documents ?? []) {
    await deleteDocumentRecord(admin, doc);
  }
}
