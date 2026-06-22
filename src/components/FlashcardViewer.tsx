"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Layers,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Flashcard } from "@/lib/supabase/types";

interface FlashcardViewerProps {
  documentId: string;
  initialCards?: Flashcard[];
}

export default function FlashcardViewer({
  documentId,
  initialCards,
}: FlashcardViewerProps) {
  const [cards, setCards] = useState<Flashcard[]>(initialCards ?? []);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      if (!res.ok) throw new Error("Failed to generate flashcards");
      const result: Flashcard[] = await res.json();
      setCards(result);
      setIndex(0);
      setFlipped(false);
    } catch {
      setError("Failed to generate flashcards. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const prev = () => {
    setFlipped(false);
    setTimeout(() => setIndex((i) => Math.max(0, i - 1)), 150);
  };

  const next = () => {
    setFlipped(false);
    setTimeout(() => setIndex((i) => Math.min(cards.length - 1, i + 1)), 150);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Generating flashcards with AI…</span>
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
          <h3 className="font-semibold text-foreground">No flashcards yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Generate AI flashcards to test your knowledge of key concepts.
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={generate} className="gap-2">
          <Sparkles className="w-4 h-4" />
          Generate Flashcards
        </Button>
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
        <Button
          variant="ghost"
          size="sm"
          className="text-xs gap-1.5 text-muted-foreground"
          onClick={() => { setIndex(0); setFlipped(false); }}
        >
          <RotateCcw className="w-3 h-3" />
          Restart
        </Button>
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
              Question
            </p>
            <p className="text-base font-semibold text-foreground leading-relaxed">
              {card.question}
            </p>
            <p className="text-xs text-muted-foreground mt-6">
              Click to reveal answer
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
              Answer
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
