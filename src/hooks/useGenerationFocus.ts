"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GenerationFocusChoice } from "@/components/GenerationFocusDialog";
import type { useParallelGenerate } from "@/hooks/useParallelGenerate";
import {
  hasGeneratedContent,
  parseStoredGenerationFocus,
} from "@/lib/generation/focus";
import type { Flashcard, Quiz, Summary } from "@/lib/supabase/types";

type GenerateApi = ReturnType<typeof useParallelGenerate>;

interface UseGenerationFocusOptions {
  isReady: boolean;
  isGroup?: boolean;
  initialSummary: Summary | null;
  initialFlashcards: Flashcard[];
  initialQuiz: Quiz | null;
  generate: GenerateApi;
  onFocusApplied?: () => void;
  registerOffTopicHandler?: (handler: () => void) => void;
}

export function useGenerationFocus({
  isReady,
  isGroup = false,
  initialSummary,
  initialFlashcards,
  initialQuiz,
  generate,
  onFocusApplied,
  registerOffTopicHandler,
}: UseGenerationFocusOptions) {
  const storedFocus = useMemo(
    () => parseStoredGenerationFocus(initialSummary),
    [initialSummary]
  );

  const initialHasContent = hasGeneratedContent(
    initialSummary,
    initialFlashcards,
    initialQuiz
  );

  const [focusDialogOpen, setFocusDialogOpen] = useState(false);
  const [hasConfirmedFocus, setHasConfirmedFocus] = useState(initialHasContent);
  const [generationMode, setGenerationMode] = useState<"general" | "focused">(
    storedFocus ? "focused" : "general"
  );
  const [generationFocus, setGenerationFocus] = useState(storedFocus ?? "");
  const [focusValidationError, setFocusValidationError] = useState<string | null>(
    null
  );

  const hasAnyContent = hasGeneratedContent(
    generate.summary.data,
    generate.flashcards.data,
    generate.quiz.data
  );

  const activeFocus = generate.focus ?? storedFocus;
  const activeMode: "general" | "focused" = activeFocus ? "focused" : "general";

  useEffect(() => {
    if (isReady && !hasConfirmedFocus && !hasAnyContent && !initialHasContent) {
      setFocusDialogOpen(true);
    }
  }, [isReady, hasConfirmedFocus, hasAnyContent, initialHasContent]);

  const applyFocusChoice = (choice: GenerationFocusChoice, regenerating: boolean) => {
    const nextFocus = choice.mode === "focused" ? (choice.focus ?? null) : null;
    setGenerationMode(choice.mode);
    setGenerationFocus(nextFocus ?? "");
    setFocusValidationError(null);
    setHasConfirmedFocus(true);
    setFocusDialogOpen(false);
    onFocusApplied?.();
    generate.regenerateAll({
      focus: nextFocus,
      regenerate: regenerating,
    });
  };

  const handleFocusConfirm = (choice: GenerationFocusChoice) => {
    applyFocusChoice(choice, hasAnyContent || initialHasContent);
  };

  const handleOffTopicError = useCallback(() => {
    generate.clearGeneratedContent();
    setHasConfirmedFocus(false);
    setGenerationMode("focused");
    setFocusValidationError("off_topic");
    setFocusDialogOpen(true);
  }, [generate]);

  useEffect(() => {
    registerOffTopicHandler?.(handleOffTopicError);
  }, [registerOffTopicHandler, handleOffTopicError]);

  const openChangeFocusDialog = () => {
    setGenerationMode(activeMode);
    setGenerationFocus(activeFocus ?? "");
    setFocusValidationError(null);
    setFocusDialogOpen(true);
  };

  const showChoosePrompt =
    isReady && !hasConfirmedFocus && !hasAnyContent && !focusDialogOpen;

  const dialogRequired = isReady && !hasConfirmedFocus && !hasAnyContent && !initialHasContent;

  return {
    isGroup,
    focusDialogOpen,
    setFocusDialogOpen,
    generationMode,
    generationFocus,
    activeMode,
    activeFocus,
    hasAnyContent,
    showChoosePrompt,
    dialogRequired,
    focusValidationError,
    handleFocusConfirm,
    openChangeFocusDialog,
  };
}
