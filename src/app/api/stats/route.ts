import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerClient();

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
