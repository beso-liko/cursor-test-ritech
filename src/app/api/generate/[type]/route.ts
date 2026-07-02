import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { getOwnedDocument, getOwnedGroup } from "@/lib/supabase/user-queries";
import {
  getSampleContext,
  getSampleContextForDocuments,
} from "@/lib/langchain/rag-chain";
import { validateFocusRelevance } from "@/lib/langchain/validate-relevance";
import {
  clearDocumentGeneratedContent,
  clearGroupGeneratedContent,
} from "@/lib/supabase/document-lifecycle";
import type { SupabaseClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const summarySchema = z.object({
  summary: z.string().describe("A comprehensive summary of the document"),
  keyPoints: z.array(z.string()).describe("5-8 key takeaways"),
  topics: z.array(z.string()).describe("Main topics covered"),
});

const flashcardsSchema = z.object({
  flashcards: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
        difficulty: z.enum(["easy", "medium", "hard"]),
      })
    )
    .min(9),
});

const quizSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string(),
        options: z.array(z.string()).length(4),
        correct: z.number().min(0).max(3),
        explanation: z.string(),
        difficulty: z.enum(["easy", "medium", "hard"]),
      })
    )
    .min(9),
});

type SummaryOutput = z.infer<typeof summarySchema>;
type FlashcardsOutput = z.infer<typeof flashcardsSchema>;
type QuizOutput = z.infer<typeof quizSchema>;

/** Fisher-Yates shuffle — unbiased, unlike sort(() => Math.random() - 0.5) */
function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleQuizAnswers(q: QuizOutput["questions"][number]): QuizOutput["questions"][number] {
  const correctAnswer = q.options[q.correct];
  const shuffled = fisherYates(q.options);
  return { ...q, options: shuffled, correct: shuffled.indexOf(correctAnswer) };
}

function langInstruction(locale: string): string {
  return locale === "sq"
    ? "\n\nIMPORTANT: Write ALL output — every word of the summary, key points, topics, questions, answers, and explanations — fully in Albanian (Shqip). Do not use any English."
    : "";
}

function normalizeFocus(focus?: string | null): string | null {
  const trimmed = focus?.trim();
  return trimmed || null;
}

function parseStoredGenerationFocus(content: string | null | undefined): string | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as { generationFocus?: string | null };
    return normalizeFocus(parsed.generationFocus);
  } catch {
    return null;
  }
}

function focusMatches(stored: string | null, requested: string | null): boolean {
  return stored === requested;
}

/** Resolve a list of documentIds from either a documentId or groupId. */
async function resolveDocumentIds(
  supabase: SupabaseClient,
  documentId?: string,
  groupId?: string
): Promise<string[]> {
  if (groupId) {
    const { data: docs } = await supabase
      .from("documents")
      .select("id")
      .eq("group_id", groupId)
      .eq("status", "ready");
    return (docs ?? []).map((d: { id: string }) => d.id);
  }
  if (documentId) return [documentId];
  return [];
}

async function getStoredGenerationFocus(
  supabase: SupabaseClient,
  isGroup: boolean,
  documentId?: string,
  groupId?: string
): Promise<string | null> {
  const query = isGroup
    ? supabase.from("summaries").select("content").eq("group_id", groupId).single()
    : supabase.from("summaries").select("content").eq("document_id", documentId).single();

  const { data } = await query;
  return parseStoredGenerationFocus(data?.content);
}

function focusInstruction(focus: string): string {
  return `\n\nFocus specifically on: ${focus}. All output should center on this area while staying faithful to the source material.`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;

  try {
    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    const { documentId, groupId, locale = "en", focus, regenerate } = await req.json();
    const requestFocus = normalizeFocus(focus);

    if (!documentId && !groupId) {
      return NextResponse.json(
        { error: "documentId or groupId is required" },
        { status: 400 }
      );
    }

    if (groupId) {
      const group = await getOwnedGroup(user.supabaseUserId, groupId);
      if (!group) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else if (documentId) {
      const doc = await getOwnedDocument(user.supabaseUserId, documentId);
      if (!doc) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const supabase = createAdminClient();

    if (!["summary", "flashcards", "quiz"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid generation type" },
        { status: 400 }
      );
    }

    const isGroup = Boolean(groupId);
    const storedFocus = await getStoredGenerationFocus(
      supabase,
      isGroup,
      documentId,
      groupId
    );

    if (regenerate || !focusMatches(storedFocus, requestFocus)) {
      if (isGroup && groupId) {
        await clearGroupGeneratedContent(supabase, groupId);
      } else if (documentId) {
        await clearDocumentGeneratedContent(supabase, documentId);
      }
    } else {
      // --- Cache check ---
      if (type === "summary") {
        const query = isGroup
          ? supabase.from("summaries").select("*").eq("group_id", groupId).single()
          : supabase.from("summaries").select("*").eq("document_id", documentId).single();

        const { data: existing } = await query;
        if (existing) {
          try {
            const parsed = JSON.parse(existing.content);
            const existingFocus = normalizeFocus(parsed.generationFocus);
            if (
              (parsed.locale ?? "en") === locale &&
              focusMatches(existingFocus, requestFocus)
            ) {
              return NextResponse.json(existing);
            }
          } catch {
            if (locale === "en" && requestFocus === null) {
              return NextResponse.json(existing);
            }
          }
        }
      }

      if (type === "flashcards") {
        const query = isGroup
          ? supabase.from("flashcards").select("*").eq("group_id", groupId)
          : supabase.from("flashcards").select("*").eq("document_id", documentId);

        const { data: existing } = await query;
        if (existing && existing.length > 0 && focusMatches(storedFocus, requestFocus)) {
          if (locale === "en") return NextResponse.json(existing);
        }
      }

      if (type === "quiz") {
        const query = isGroup
          ? supabase.from("quizzes").select("*").eq("group_id", groupId).single()
          : supabase.from("quizzes").select("*").eq("document_id", documentId).single();

        const { data: existing } = await query;
        if (existing && focusMatches(storedFocus, requestFocus)) {
          if (locale === "en") return NextResponse.json(existing);
        }
      }
    }

    // --- Retrieve RAG context ---
    let context: string;
    if (isGroup) {
      const docIds = await resolveDocumentIds(supabase, undefined, groupId);
      if (docIds.length === 0) {
        return NextResponse.json(
          { error: "No ready documents in this group" },
          { status: 422 }
        );
      }

      if (requestFocus) {
        const relevance = await validateFocusRelevance(requestFocus, {
          documentIds: docIds,
          userId: user.supabaseUserId,
        });
        if (!relevance.valid) {
          return NextResponse.json({ error: relevance.error }, { status: 422 });
        }
        context = relevance.context;
      } else {
        context = await getSampleContextForDocuments(
          docIds,
          undefined,
          user.supabaseUserId
        );
      }
    } else if (requestFocus) {
      const relevance = await validateFocusRelevance(requestFocus, {
        documentId,
        userId: user.supabaseUserId,
      });
      if (!relevance.valid) {
        return NextResponse.json({ error: relevance.error }, { status: 422 });
      }
      context = relevance.context;
    } else {
      context = await getSampleContext(documentId, undefined, user.supabaseUserId);
    }

    if (!context) {
      return NextResponse.json(
        { error: "Document not processed yet" },
        { status: 422 }
      );
    }

    const lang = langInstruction(locale);
    const focusLine = requestFocus ? focusInstruction(requestFocus) : "";
    const sourceLabel = isGroup
      ? "these study materials"
      : "this document";

    if (type === "summary") {
      const result = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: summarySchema,
        prompt: `Based on the following content from ${sourceLabel}, generate a comprehensive study summary.

Document content:
${context}

Generate a detailed summary with key points and main topics covered.${focusLine}${lang}`,
      });
      const object = result.object as SummaryOutput;

      const row = isGroup
        ? {
            group_id: groupId,
            content: JSON.stringify({
              locale,
              generationFocus: requestFocus,
              ...object,
            }),
          }
        : {
            document_id: documentId,
            content: JSON.stringify({
              locale,
              generationFocus: requestFocus,
              ...object,
            }),
          };

      const { data, error } = await supabase
        .from("summaries")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(row as any)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    if (type === "flashcards") {
      const result = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: flashcardsSchema,
        prompt: `Based on the following content from ${sourceLabel}, generate exactly 15 flashcards for studying.
Distribute difficulty evenly: exactly 5 easy, 5 medium, and 5 hard.
- Easy: basic definitions and straightforward recall
- Medium: questions requiring understanding and application of concepts
- Hard: questions requiring analysis, synthesis, or nuanced understanding
Each flashcard must include a "difficulty" field set to "easy", "medium", or "hard".

Document content:
${context}

Generate clear, concise question-answer pairs.${focusLine}${lang}`,
      });
      const object = result.object as FlashcardsOutput;

      const rows = object.flashcards.map(
        (fc: { question: string; answer: string; difficulty: string }) =>
          isGroup
            ? { group_id: groupId, question: fc.question, answer: fc.answer, difficulty: fc.difficulty }
            : { document_id: documentId, question: fc.question, answer: fc.answer, difficulty: fc.difficulty }
      );

      const { data, error } = await supabase
        .from("flashcards")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(rows as any)
        .select();

      if (error) throw error;
      return NextResponse.json(data);
    }

    if (type === "quiz") {
      const result = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: quizSchema,
        prompt: `Based on the following content from ${sourceLabel}, generate exactly 18 multiple choice questions.
Distribute difficulty evenly: exactly 6 easy, 6 medium, and 6 hard.
- Easy: basic recall and definition questions
- Medium: questions requiring understanding and application
- Hard: questions requiring analysis, synthesis, or nuanced understanding
Each question must include a "difficulty" field set to "easy", "medium", or "hard".
Each question has 4 options. Place the correct answer at a RANDOM position (index 0, 1, 2, or 3) — distribute correct answers unpredictably across all positions.
Include a brief explanation for the correct answer.
All 18 questions must be distinct — no repeated concepts.

Document content:
${context}

Generate challenging but fair questions that test understanding of key concepts.${focusLine}${lang}`,
      });
      const object = result.object as QuizOutput;
      const questions = object.questions.map(shuffleQuizAnswers);

      const row = isGroup
        ? { group_id: groupId, questions }
        : { document_id: documentId, questions };

      const { data, error } = await supabase
        .from("quizzes")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(row as any)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (err) {
    console.error(`Generate ${type} error:`, err);
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}
