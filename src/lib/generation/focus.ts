import type { SupabaseClient } from "@supabase/supabase-js";
import type { Summary } from "@/lib/supabase/types";

export function normalizeGenerationFocus(focus?: string | null): string | null {
  const trimmed = focus?.trim();
  return trimmed || null;
}

export function parseGenerationFocusFromContent(
  content: string | null | undefined
): string | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as {
      generationFocus?: string | null;
    };
    return normalizeGenerationFocus(parsed.generationFocus);
  } catch {
    return null;
  }
}

export function parseStoredGenerationFocus(
  summary: Summary | null | undefined
): string | null {
  return parseGenerationFocusFromContent(summary?.content);
}

export async function getStoredGenerationFocus(
  supabase: SupabaseClient,
  isGroup: boolean,
  documentId?: string,
  groupId?: string
): Promise<string | null> {
  const query = isGroup
    ? supabase.from("summaries").select("content").eq("group_id", groupId).single()
    : supabase
        .from("summaries")
        .select("content")
        .eq("document_id", documentId)
        .single();

  const { data } = await query;
  return parseGenerationFocusFromContent(data?.content);
}

export function hasGeneratedContent(
  summary: Summary | null | undefined,
  flashcards: unknown[] | null | undefined,
  quiz: unknown | null | undefined
): boolean {
  return Boolean(summary) || Boolean(flashcards?.length) || Boolean(quiz);
}
