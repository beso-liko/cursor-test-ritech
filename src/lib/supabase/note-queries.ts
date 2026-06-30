import type { Note } from "@/lib/supabase/types";
import { createAdminClient } from "@/lib/supabase/server";

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
