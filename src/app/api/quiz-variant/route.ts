import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { createAdminClient } from "@/lib/supabase/server";
import type { QuizQuestion } from "@/lib/supabase/types";

/** Fisher-Yates unbiased shuffle */
function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick `n` random items from `arr` without replacement */
function pickRandom<T>(arr: T[], n: number): T[] {
  return fisherYates(arr).slice(0, n);
}

function shuffleAnswers(q: QuizQuestion): QuizQuestion {
  const correctAnswer = q.options[q.correct];
  const shuffled = fisherYates(q.options);
  return { ...q, options: shuffled, correct: shuffled.indexOf(correctAnswer) };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const quizId = searchParams.get("quizId");

  if (!quizId) {
    return NextResponse.json({ error: "quizId is required" }, { status: 400 });
  }

  try {
    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;

    const admin = createAdminClient();
    const { data: quiz, error } = await admin
      .from("quizzes")
      .select("*")
      .eq("id", quizId)
      .single();

    if (error || !quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const pool: QuizQuestion[] = quiz.questions ?? [];

    const easy = pool.filter((q) => q.difficulty === "easy");
    const medium = pool.filter((q) => q.difficulty === "medium");
    const hard = pool.filter((q) => q.difficulty === "hard");

    const selected = [
      ...pickRandom(easy, Math.min(3, easy.length)),
      ...pickRandom(medium, Math.min(3, medium.length)),
      ...pickRandom(hard, Math.min(3, hard.length)),
    ];

    const questions = fisherYates(selected).map(shuffleAnswers);

    return NextResponse.json({ ...quiz, questions });
  } catch (err) {
    console.error("Quiz variant error:", err);
    return NextResponse.json({ error: "Failed to generate variant" }, { status: 500 });
  }
}
