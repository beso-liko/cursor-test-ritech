"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import { useTextSelectionAction } from "@/hooks/useTextSelectionAction";
import { useNotesOptional } from "@/components/notes/NotesProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SelectableContentProps {
  children: React.ReactNode;
  className?: string;
}

export default function SelectableContent({
  children,
  className,
}: SelectableContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const notes = useNotesOptional();
  const { t } = useLanguage();
  const enabled = (notes?.openNoteIds.length ?? 0) > 0;
  const { selection, clearSelection } = useTextSelectionAction(
    enabled,
    containerRef
  );

  const handleAdd = () => {
    if (!selection || !notes) return;
    notes.insertIntoFocusedNote(selection.text);
    clearSelection();
  };

  const preventSelectionClear = (e: React.PointerEvent) => {
    e.preventDefault();
  };

  return (
    <div ref={containerRef} className={className}>
      {children}
      {enabled &&
        selection &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            {/* Mobile: fixed bottom bar above the notes mobile bar — avoids native callout overlap */}
            <div
              className={cn(
                "fixed inset-x-4 z-[70] flex items-center gap-3 lg:hidden",
                "bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))]",
                "rounded-2xl border border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm"
              )}
            >
              <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                &ldquo;{selection.text}&rdquo;
              </p>
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0 gap-1.5 px-3 text-xs"
                onPointerDown={preventSelectionClear}
                onClick={handleAdd}
              >
                {t("notes.addToNote")}
              </Button>
            </div>

            {/* Desktop: floating button below the selection */}
            <div
              className="fixed z-[70] hidden -translate-x-1/2 lg:block"
              style={{ top: selection.top, left: selection.left }}
            >
              <Button
                type="button"
                size="sm"
                className="h-7 gap-1.5 px-2.5 text-xs shadow-md"
                onMouseDown={preventSelectionClear}
                onClick={handleAdd}
              >
                {t("notes.addToNote")}
              </Button>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
