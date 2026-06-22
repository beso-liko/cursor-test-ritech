import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { getSampleContext } from "@/lib/langchain/rag-chain";

export const maxDuration = 60;

const summarySchema = z.object({
  summary: z.string().describe("A comprehensive summary of the document"),
  keyPoints: z.array(z.string()).describe("5-8 key takeaways"),
  topics: z.array(z.string()).describe("Main topics covered"),
});

const flashcardsSchema = z.object({
  flashcards: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
    })
  ),
});

const quizSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()).length(4),
      correct: z.number().min(0).max(3),
      explanation: z.string(),
    })
  ),
});

type SummaryOutput = z.infer<typeof summarySchema>;
type FlashcardsOutput = z.infer<typeof flashcardsSchema>;
type QuizOutput = z.infer<typeof quizSchema>;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;

  try {
    const { documentId } = await req.json();

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId is required" },
        { status: 400 }
      );
    }

    if (!["summary", "flashcards", "quiz"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid generation type" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check cache
    if (type === "summary") {
      const { data: existing } = await supabase
        .from("summaries")
        .select("*")
        .eq("document_id", documentId)
        .single();
      if (existing) return NextResponse.json(existing);
    }

    if (type === "flashcards") {
      const { data: existing } = await supabase
        .from("flashcards")
        .select("*")
        .eq("document_id", documentId);
      if (existing && existing.length > 0) return NextResponse.json(existing);
    }

    if (type === "quiz") {
      const { data: existing } = await supabase
        .from("quizzes")
        .select("*")
        .eq("document_id", documentId)
        .single();
      if (existing) return NextResponse.json(existing);
    }

    // Retrieve document context via RAG
    const context = await getSampleContext(documentId);

    if (!context) {
      return NextResponse.json(
        { error: "Document not processed yet" },
        { status: 422 }
      );
    }

    if (type === "summary") {
      const result = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: summarySchema,
        prompt: `Based on the following document content, generate a comprehensive study summary.

Document content:
${context}

Generate a detailed summary with key points and main topics covered.`,
      });
      const object = result.object as SummaryOutput;

      const { data, error } = await supabase
        .from("summaries")
        .insert({
          document_id: documentId,
          content: JSON.stringify(object),
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

    if (type === "flashcards") {
      const result = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: flashcardsSchema,
        prompt: `Based on the following document content, generate 10-15 flashcards for studying.
Each flashcard should test an important concept, definition, or fact from the document.

Document content:
${context}

Generate clear, concise question-answer pairs.`,
      });
      const object = result.object as FlashcardsOutput;

      const rows = object.flashcards.map(
        (fc: { question: string; answer: string }) => ({
          document_id: documentId,
          question: fc.question,
          answer: fc.answer,
        })
      );

      const { data, error } = await supabase
        .from("flashcards")
        .insert(rows)
        .select();

      if (error) throw error;
      return NextResponse.json(data);
    }

    if (type === "quiz") {
      const result = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: quizSchema,
        prompt: `Based on the following document content, generate a 10-question multiple choice quiz.
Each question should have 4 options with only one correct answer.
Include a brief explanation for the correct answer.

Document content:
${context}

Generate challenging but fair questions that test understanding of key concepts.`,
      });
      const object = result.object as QuizOutput;

      const { data, error } = await supabase
        .from("quizzes")
        .insert({
          document_id: documentId,
          questions: object.questions,
        })
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
