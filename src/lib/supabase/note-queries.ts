import type { Note, NoteFolder } from "@/lib/supabase/types";
import { createAdminClient } from "@/lib/supabase/server";

export async function getOwnedNoteFolder(
  supabaseUserId: string,
  folderId: string
): Promise<NoteFolder | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("note_folders")
    .select("*")
    .eq("id", folderId)
    .eq("user_id", supabaseUserId)
    .maybeSingle();

  if (error) throw error;
  return data as NoteFolder | null;
}

export async function getOwnedNote(
  supabaseUserId: string,
  noteId: string
): Promise<Note | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notes")
    .select("*")
    .eq("id", noteId)
    .eq("user_id", supabaseUserId)
    .maybeSingle();

  if (error) throw error;
  return data as Note | null;
}
