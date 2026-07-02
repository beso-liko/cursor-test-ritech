"use client";

import { useCallback, useMemo, useState } from "react";
import { useBackgroundGenerate } from "@/hooks/useBackgroundGenerate";
import type { Summary, Flashcard, Quiz } from "@/lib/supabase/types";

export interface GenerateSlot<T> {
  data: T | null;
  isLoading: boolean;
  timedOut: boolean;
  startGenerate: (overrideBody?: Record<string, unknown>) => void;
}

interface UseParallelGenerateOptions {
  documentId?: string;
  groupId?: string;
  locale: string;
  initialSummary: Summary | null;
  initialFlashcards: Flashcard[];
  initialQuiz: Quiz | null;
  autoStart?: boolean;
  initialFocus?: string | null;
  onOffTopic?: () => void;
}

interface RegenerateAllOptions {
  focus?: string | null;
  regenerate?: boolean;
}

interface UseParallelGenerateReturn {
  summary: GenerateSlot<Summary>;
  flashcards: GenerateSlot<Flashcard[]>;
  quiz: GenerateSlot<Quiz>;
  focus: string | null;
  clearGeneratedContent: () => void;
  regenerateAll: (opts?: RegenerateAllOptions) => void;
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

function buildRequestBody(
  groupId: string | undefined,
  documentId: string | undefined,
  locale: string,
  focus: string | null,
  extra?: Record<string, unknown>
) {
  return {
    ...(groupId ? { groupId } : { documentId }),
    locale,
    ...(focus ? { focus } : {}),
    ...extra,
  };
}

export function useParallelGenerate({
  documentId,
  groupId,
  locale,
  initialSummary,
  initialFlashcards,
  initialQuiz,
  autoStart = true,
  initialFocus = null,
  onOffTopic,
}: UseParallelGenerateOptions): UseParallelGenerateReturn {
  const [focus, setFocus] = useState<string | null>(initialFocus);

  const body = useMemo(
    () => buildRequestBody(groupId, documentId, locale, focus),
    [groupId, documentId, locale, focus]
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
    autoStart,
    apiPath: "/api/generate/summary",
    body,
    pollFn: summaryPollFn,
    onResult: setSummaryData,
    onOffTopic,
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
    autoStart,
    apiPath: "/api/generate/flashcards",
    body,
    pollFn: flashcardsPollFn,
    onResult: setFlashcardsData,
    onOffTopic,
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
    autoStart,
    apiPath: "/api/generate/quiz",
    body,
    pollFn: quizPollFn,
    onResult: setQuizData,
    onOffTopic,
  });

  const clearGeneratedContent = useCallback(() => {
    setSummaryData(null);
    setFlashcardsData([]);
    setQuizData(null);
  }, []);

  const regenerateAll = useCallback(
    (opts?: RegenerateAllOptions) => {
      const nextFocus = opts?.focus !== undefined ? opts.focus : focus;
      if (opts?.focus !== undefined) {
        setFocus(nextFocus);
      }

      clearGeneratedContent();

      const override = buildRequestBody(groupId, documentId, locale, nextFocus, {
        ...(opts?.regenerate ? { regenerate: true } : {}),
      });

      startSummary(override);
      startFlashcards(override);
      startQuiz(override);
    },
    [
      focus,
      clearGeneratedContent,
      groupId,
      documentId,
      locale,
      startSummary,
      startFlashcards,
      startQuiz,
    ]
  );

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
    focus,
    clearGeneratedContent,
    regenerateAll,
  };
}
