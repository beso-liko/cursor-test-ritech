import { createServerClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import DashboardContent from "@/components/DashboardContent";
import type { Document } from "@/lib/supabase/types";

async function getStats() {
  try {
    const supabase = createServerClient();
    const [
      { count: totalDocs },
      { count: totalFlashcards },
      { count: totalQuizzes },
      { count: quizzesTaken },
    ] = await Promise.all([
      supabase.from("documents").select("*", { count: "exact", head: true }),
      supabase.from("flashcards").select("*", { count: "exact", head: true }),
      supabase.from("quizzes").select("*", { count: "exact", head: true }),
      supabase.from("quiz_results").select("*", { count: "exact", head: true }),
    ]);
    return {
      totalDocuments: totalDocs ?? 0,
      totalFlashcards: totalFlashcards ?? 0,
      totalQuizzes: totalQuizzes ?? 0,
      quizzesTaken: quizzesTaken ?? 0,
    };
  } catch {
    return { totalDocuments: 0, totalFlashcards: 0, totalQuizzes: 0, quizzesTaken: 0 };
  }
}

async function getRecentDocuments(): Promise<Document[]> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6);
    return (data as Document[]) ?? [];
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const [stats, recentDocs] = await Promise.all([
    getStats(),
    getRecentDocuments(),
  ]);

  return (
    <AppShell>
      <DashboardContent stats={stats} recentDocs={recentDocs} />
    </AppShell>
  );
}
