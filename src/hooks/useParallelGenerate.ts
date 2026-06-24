"use client";

import { useMemo, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useBackgroundGenerate } from "@/hooks/useBackgroundGenerate";
import type { Summary, Flashcard, Quiz } from "@/lib/supabase/types";

export interface GenerateSlot<T> {
  data: T | null;
  isLoading: boolean;
  timedOut: boolean;
  startGenerate: () => void;
}

interface UseParallelGenerateOptions {
  documentId?: string;
  groupId?: string;
  locale: string;
  initialSummary: Summary | null;
  initialFlashcards: Flashcard[];
  initialQuiz: Quiz | null;
}

interface UseParallelGenerateReturn {
  summary: GenerateSlot<Summary>;
  flashcards: GenerateSlot<Flashcard[]>;
  quiz: GenerateSlot<Quiz>;
}

export function useParallelGenerate({
  documentId,
  groupId,
  locale,
  initialSummary,
  initialFlashcards,
  initialQuiz,
}: UseParallelGenerateOptions): UseParallelGenerateReturn {
  const supabase = useMemo(() => createBrowserClient(), []);

  const body = useMemo(
    () => (groupId ? { groupId, locale } : { documentId, locale }),
    [groupId, documentId, locale]
  );

  // --- Summary ---
  const [summaryData, setSummaryData] = useState<Summary | null>(initialSummary);

  const summaryPollFn = useMemo(
    () => async (): Promise<Summary | null> => {
      const query = groupId
        ? supabase.from("summaries").select("*").eq("group_id", groupId).single()
        : supabase.from("summaries").select("*").eq("document_id", documentId).single();
      const { data: row } = await query;
      return row ?? null;
    },
    [supabase, groupId, documentId]
  );

  const {
    isPolling: summaryLoading,
    timedOut: summaryTimedOut,
    startGenerate: startSummary,
  } = useBackgroundGenerate<Summary>({
    hasInitialData: Boolean(initialSummary),
    apiPath: "/api/generate/summary",
    body,
    pollFn: summaryPollFn,
    onResult: setSummaryData,
  });

  // --- Flashcards ---
  const [flashcardsData, setFlashcardsData] = useState<Flashcard[]>(initialFlashcards);

  const flashcardsPollFn = useMemo(
    () => async (): Promise<Flashcard[] | null> => {
      const query = groupId
        ? supabase.from("flashcards").select("*").eq("group_id", groupId)
        : supabase.from("flashcards").select("*").eq("document_id", documentId);
      const { data: rows } = await query;
      return rows && rows.length > 0 ? (rows as Flashcard[]) : null;
    },
    [supabase, groupId, documentId]
  );

  const {
    isPolling: flashcardsLoading,
    timedOut: flashcardsTimedOut,
    startGenerate: startFlashcards,
  } = useBackgroundGenerate<Flashcard[]>({
    hasInitialData: Boolean(initialFlashcards && initialFlashcards.length > 0),
    apiPath: "/api/generate/flashcards",
    body,
    pollFn: flashcardsPollFn,
    onResult: setFlashcardsData,
  });

  // --- Quiz ---
  const [quizData, setQuizData] = useState<Quiz | null>(initialQuiz);

  const quizPollFn = useMemo(
    () => async (): Promise<Quiz | null> => {
      const query = groupId
        ? supabase.from("quizzes").select("*").eq("group_id", groupId).single()
        : supabase.from("quizzes").select("*").eq("document_id", documentId).single();
      const { data: row } = await query;
      return row ?? null;
    },
    [supabase, groupId, documentId]
  );

  const {
    isPolling: quizLoading,
    timedOut: quizTimedOut,
    startGenerate: startQuiz,
  } = useBackgroundGenerate<Quiz>({
    hasInitialData: Boolean(initialQuiz),
    apiPath: "/api/generate/quiz",
    body,
    pollFn: quizPollFn,
    onResult: setQuizData,
  });

  return {
    summary: {
      data: summaryData,
      isLoading: summaryLoading,
      timedOut: summaryTimedOut,
      startGenerate: startSummary,
    },
    flashcards: {
      data: flashcardsData,
      isLoading: flashcardsLoading,
      timedOut: flashcardsTimedOut,
      startGenerate: startFlashcards,
    },
    quiz: {
      data: quizData,
      isLoading: quizLoading,
      timedOut: quizTimedOut,
      startGenerate: startQuiz,
    },
  };
}
