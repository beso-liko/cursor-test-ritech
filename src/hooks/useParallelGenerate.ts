"use client";

import { useMemo, useState } from "react";
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

function contentPollUrl(
  type: "summary" | "flashcards" | "quiz",
  documentId?: string,
  groupId?: string
) {
  const params = new URLSearchParams({ type });
  if (groupId) params.set("groupId", groupId);
  else if (documentId) params.set("documentId", documentId);
  return `/api/content?${params.toString()}`;
}

export function useParallelGenerate({
  documentId,
  groupId,
  locale,
  initialSummary,
  initialFlashcards,
  initialQuiz,
}: UseParallelGenerateOptions): UseParallelGenerateReturn {
  const body = useMemo(
    () => (groupId ? { groupId, locale } : { documentId, locale }),
    [groupId, documentId, locale]
  );

  const [summaryData, setSummaryData] = useState<Summary | null>(initialSummary);

  const summaryPollFn = useMemo(
    () => async (): Promise<Summary | null> => {
      const res = await fetch(contentPollUrl("summary", documentId, groupId));
      if (!res.ok) return null;
      const row = await res.json();
      return row?.id ? row : null;
    },
    [groupId, documentId]
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

  const [flashcardsData, setFlashcardsData] = useState<Flashcard[]>(initialFlashcards);

  const flashcardsPollFn = useMemo(
    () => async (): Promise<Flashcard[] | null> => {
      const res = await fetch(contentPollUrl("flashcards", documentId, groupId));
      if (!res.ok) return null;
      const rows = await res.json();
      return Array.isArray(rows) && rows.length > 0 ? rows : null;
    },
    [groupId, documentId]
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

  const [quizData, setQuizData] = useState<Quiz | null>(initialQuiz);

  const quizPollFn = useMemo(
    () => async (): Promise<Quiz | null> => {
      const res = await fetch(contentPollUrl("quiz", documentId, groupId));
      if (!res.ok) return null;
      const row = await res.json();
      return row?.id ? row : null;
    },
    [groupId, documentId]
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
