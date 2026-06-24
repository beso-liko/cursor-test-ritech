"use client";

import { useEffect, useState } from "react";
import { Sparkles, CheckCircle, XCircle, Trophy, RotateCcw, Loader2, ClipboardList, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Quiz, QuizQuestion } from "@/lib/supabase/types";
import { useLanguage } from "@/components/LanguageProvider";

interface QuizInterfaceProps {
  quiz: Quiz | null;
  isLoading: boolean;
  timedOut: boolean;
  onRegenerate: () => void;
}

type QuizPhase = "idle" | "active" | "result";

export default function QuizInterface({
  quiz: initialQuiz,
  isLoading,
  timedOut,
  onRegenerate,
}: QuizInterfaceProps) {
  const { t } = useLanguage();
  const [quiz, setQuiz] = useState<Quiz | null>(initialQuiz);
  const [phase, setPhase] = useState<QuizPhase>("idle");
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [retakeLoading, setRetakeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Sync when the parent delivers a new quiz (first generation or regeneration)
  useEffect(() => {
    if (initialQuiz) {
      setQuiz(initialQuiz);
      setPhase("idle");
    }
  }, [initialQuiz]);

  const startQuiz = () => {
    setPhase("active");
    setCurrentQ(0);
    setAnswers([]);
    setSelected(null);
    setShowExplanation(false);
  };

  const retake = async () => {
    if (!quiz) return;
    setRetakeLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quiz-variant?quizId=${quiz.id}`);
      if (!res.ok) throw new Error("Failed to load variant");
      const variant: Quiz = await res.json();
      setQuiz(variant);
      setPhase("active");
      setCurrentQ(0);
      setAnswers([]);
      setSelected(null);
      setShowExplanation(false);
    } catch {
      setError(t("quiz.error"));
    } finally {
      setRetakeLoading(false);
    }
  };

  const handleAnswer = (optionIdx: number) => {
    if (selected !== null) return;
    setSelected(optionIdx);
    setShowExplanation(true);
  };

  const handleNext = async () => {
    if (selected === null || !quiz) return;
    const newAnswers = [...answers, selected];

    if (currentQ < quiz.questions.length - 1) {
      setAnswers(newAnswers);
      setCurrentQ((q) => q + 1);
      setSelected(null);
      setShowExplanation(false);
    } else {
      const score = newAnswers.filter(
        (ans, i) => ans === quiz.questions[i].correct
      ).length;

      await fetch("/api/quiz-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.id,
          score,
          total: quiz.questions.length,
          answers: newAnswers,
        }),
      }).catch(console.error);

      setAnswers(newAnswers);
      setPhase("result");
    }
  };

  // --- Loading state ---
  if ((isLoading && !quiz) || retakeLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t("quiz.generating")}</span>
        </div>
        <Skeleton className="h-6 w-3/4" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // --- No quiz yet ---
  if (!quiz) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ClipboardList className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{t("quiz.empty.title")}</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            {t("quiz.empty.desc")}
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {timedOut && (
          <Button onClick={onRegenerate} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            {t("quiz.generate")}
          </Button>
        )}
      </div>
    );
  }

  // --- Quiz ready (idle) ---
  if (phase === "idle") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ClipboardList className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{t("quiz.ready.title")}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("quiz.ready.questions", { n: quiz.questions.length })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={startQuiz} className="gap-2">
            {t("quiz.start")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground text-xs"
            onClick={onRegenerate}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            {t("quiz.generate")}
          </Button>
        </div>
      </div>
    );
  }

  // --- Results screen ---
  if (phase === "result") {
    const score = answers.filter(
      (ans, i) => ans === quiz.questions[i].correct
    ).length;
    const pct = Math.round((score / quiz.questions.length) * 100);
    const grade =
      pct >= 90
        ? t("quiz.result.excellent")
        : pct >= 70
        ? t("quiz.result.good")
        : pct >= 50
        ? t("quiz.result.keep")
        : t("quiz.result.practice");

    return (
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-3 py-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground">{grade}</h3>
            <p className="text-4xl font-bold text-primary mt-1">{pct}%</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("quiz.result.score", { score, total: quiz.questions.length })}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {quiz.questions.map((q: QuizQuestion, i: number) => {
            const correct = answers[i] === q.correct;
            return (
              <div
                key={i}
                className={cn(
                  "rounded-xl p-3 border text-sm",
                  correct
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-red-50 border-red-200"
                )}
              >
                <div className="flex items-start gap-2">
                  {correct ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="font-medium text-foreground">{q.question}</p>
                    {!correct && (
                      <p className="text-xs text-emerald-700 mt-1">
                        {t("quiz.result.correct", { answer: q.options[q.correct] })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={retake}
        >
          <RotateCcw className="w-4 h-4" />
          {t("quiz.retake")}
        </Button>
      </div>
    );
  }

  // --- Active quiz ---
  const question = quiz.questions[currentQ];
  const progress = (currentQ / quiz.questions.length) * 100;

  return (
    <div className="max-w-xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            {t("quiz.question", { current: currentQ + 1, total: quiz.questions.length })}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {t("quiz.progress", { pct: Math.round(progress) })}
          </span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Question */}
      <p className="text-base font-semibold text-foreground leading-relaxed">
        {question.question}
      </p>

      {/* Options */}
      <div className="space-y-2.5">
        {question.options.map((option: string, i: number) => {
          const isSelected = selected === i;
          const isCorrect = i === question.correct;
          const revealed = selected !== null;

          return (
            <button
              key={i}
              disabled={revealed}
              onClick={() => handleAnswer(i)}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl border text-sm transition-all",
                !revealed &&
                  "hover:border-primary/50 hover:bg-primary/5 border-border",
                revealed && isCorrect &&
                  "bg-emerald-50 border-emerald-300 text-emerald-800",
                revealed && isSelected && !isCorrect &&
                  "bg-red-50 border-red-300 text-red-800",
                revealed && !isSelected && !isCorrect &&
                  "opacity-50 border-border"
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "w-5 h-5 rounded-full border text-xs font-bold flex items-center justify-center shrink-0",
                    !revealed && "border-muted-foreground/40 text-muted-foreground",
                    revealed && isCorrect && "border-emerald-500 text-emerald-700 bg-emerald-100",
                    revealed && isSelected && !isCorrect && "border-red-500 text-red-700 bg-red-100"
                  )}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                {option}
                {revealed && isCorrect && (
                  <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto shrink-0" />
                )}
                {revealed && isSelected && !isCorrect && (
                  <XCircle className="w-4 h-4 text-red-500 ml-auto shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {showExplanation && (
        <div className="rounded-xl bg-accent/50 border border-border p-3 text-sm">
          <p className="font-medium text-foreground mb-1">{t("quiz.explanation")}</p>
          <p className="text-muted-foreground">{question.explanation}</p>
        </div>
      )}

      {/* Next button */}
      {selected !== null && (
        <Button className="w-full" onClick={handleNext}>
          {currentQ < quiz.questions.length - 1
            ? t("quiz.next")
            : t("quiz.seeResults")}
        </Button>
      )}
    </div>
  );
}
