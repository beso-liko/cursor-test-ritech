"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import { useTextSelectionAction } from "@/hooks/useTextSelectionAction";
import { useNotesOptional } from "@/components/notes/NotesProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";

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

  return (
    <div ref={containerRef} className={className}>
      {children}
      {enabled &&
        selection &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[70] -translate-x-1/2"
            style={{ top: selection.top, left: selection.left }}
          >
            <Button
              type="button"
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs shadow-md"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleAdd}
            >
              {t("notes.addToNote")}
            </Button>
          </div>,
          document.body
        )}
    </div>
  );
}
