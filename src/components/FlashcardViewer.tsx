"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Layers,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Flashcard } from "@/lib/supabase/types";
import { useLanguage } from "@/components/LanguageProvider";

interface FlashcardViewerProps {
  cards: Flashcard[];
  isLoading: boolean;
  timedOut: boolean;
  onRegenerate: () => void;
}

export default function FlashcardViewer({
  cards,
  isLoading,
  timedOut,
  onRegenerate,
}: FlashcardViewerProps) {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const prev = () => {
    setFlipped(false);
    setTimeout(() => setIndex((i) => Math.max(0, i - 1)), 150);
  };

  const next = () => {
    setFlipped(false);
    setTimeout(() => setIndex((i) => Math.min(cards.length - 1, i + 1)), 150);
  };

  if (isLoading && cards.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t("flashcards.generating")}</span>
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Layers className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">
            {t("flashcards.empty.title")}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            {t("flashcards.empty.desc")}
          </p>
        </div>
        {timedOut && (
          <Button onClick={onRegenerate} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            {t("flashcards.generate")}
          </Button>
        )}
      </div>
    );
  }

  const card = cards[index];

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">
          {index + 1} / {cards.length}
        </Badge>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1.5 text-muted-foreground"
            onClick={() => { setIndex(0); setFlipped(false); }}
          >
            <RotateCcw className="w-3 h-3" />
            {t("flashcards.restart")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1.5 text-muted-foreground"
            onClick={onRegenerate}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            {t("flashcards.generate")}
          </Button>
        </div>
      </div>

      {/* Flashcard flip */}
      <div
        className="cursor-pointer"
        style={{ perspective: "1000px" }}
        onClick={() => setFlipped((f) => !f)}
      >
        <div
          className="relative transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            minHeight: "200px",
          }}
        >
          {/* Front (Question) */}
          <div
            className="absolute inset-0 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 flex flex-col items-center justify-center p-8 text-center"
            style={{ backfaceVisibility: "hidden" }}
          >
            <p className="text-xs font-medium text-primary uppercase tracking-widest mb-4">
              {t("flashcards.question")}
            </p>
            <p className="text-base font-semibold text-foreground leading-relaxed">
              {card.question}
            </p>
            <p className="text-xs text-muted-foreground mt-6">
              {t("flashcards.reveal")}
            </p>
          </div>

          {/* Back (Answer) */}
          <div
            className="absolute inset-0 rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 flex flex-col items-center justify-center p-8 text-center"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-widest mb-4">
              {t("flashcards.answer")}
            </p>
            <p className="text-base text-foreground leading-relaxed">{card.answer}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={prev}
          disabled={index === 0}
          className={cn("h-9 w-9", index === 0 && "opacity-40")}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex gap-1">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => { setFlipped(false); setIndex(i); }}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all",
                i === index ? "bg-primary w-4" : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={next}
          disabled={index === cards.length - 1}
          className={cn("h-9 w-9", index === cards.length - 1 && "opacity-40")}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
