"use client";

import { ChevronUp, StickyNote } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { useNotes } from "@/components/notes/NotesProvider";
import { cn } from "@/lib/utils";

export default function NotesMobileBar() {
  const { t } = useLanguage();
  const { openNoteIds, focusedNoteId, notesById, setDockOpen } = useNotes();

  if (openNoteIds.length === 0) return null;

  const activeId = focusedNoteId ?? openNoteIds[openNoteIds.length - 1];
  const title = notesById[activeId]?.title || t("notes.untitled");
  const extraCount = openNoteIds.length - 1;

  return (
    <button
      type="button"
      onClick={() => setDockOpen(true)}
      className={cn(
        "fixed z-[62] flex items-center gap-3 lg:hidden",
        "bottom-4 left-4 right-4 rounded-2xl border border-border",
        "bg-background/95 px-4 py-3 shadow-lg backdrop-blur-sm",
        "transition-transform duration-300 ease-out active:scale-[0.98]",
        "motion-reduce:transition-none"
      )}
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label={t("notes.mobileBar.open")}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <StickyNote className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {extraCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {t("notes.mobileBar.more").replace("{n}", String(extraCount))}
          </p>
        )}
      </div>
      <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
    </button>
  );
}
