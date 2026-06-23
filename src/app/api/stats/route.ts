import { NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createAuthClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [
      { count: totalDocs },
      { count: totalFlashcards },
      { count: totalQuizzes },
      { count: totalQuizResults },
    ] = await Promise.all([
      supabase.from("documents").select("*", { count: "exact", head: true }),
      supabase.from("flashcards").select("*", { count: "exact", head: true }),
      supabase.from("quizzes").select("*", { count: "exact", head: true }),
      supabase.from("quiz_results").select("*", { count: "exact", head: true }),
    ]);

    return NextResponse.json({
      totalDocuments: totalDocs ?? 0,
      totalFlashcards: totalFlashcards ?? 0,
      totalQuizzes: totalQuizzes ?? 0,
      quizzesTaken: totalQuizResults ?? 0,
    });
  } catch (err) {
    console.error("Stats error:", err);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
