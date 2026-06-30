"use client";

import { useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";
import { useNotes } from "@/components/notes/NotesProvider";
import NotePanel from "@/components/notes/NotePanel";
import NotesMobileBar from "@/components/notes/NotesMobileBar";

function NoteTabs() {
  const { t } = useLanguage();
  const { openNoteIds, focusedNoteId, setFocusedNoteId, notesById } = useNotes();

  if (openNoteIds.length === 0) return null;

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border px-2 py-1.5">
      {openNoteIds.map((id) => {
        const title = notesById[id]?.title ?? t("notes.untitled");
        const active = focusedNoteId === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setFocusedNoteId(id)}
            className={cn(
              "max-w-[7rem] shrink-0 truncate rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {title}
          </button>
        );
      })}
    </div>
  );
}

function DockContent() {
  const { openNoteIds, focusedNoteId } = useNotes();
  const activeId = focusedNoteId ?? openNoteIds[openNoteIds.length - 1];

  return (
    <>
      <NoteTabs />
      <div className="min-h-0 flex-1">
        {openNoteIds.map((id) => (
          <NotePanel key={id} noteId={id} isActive={id === activeId} />
        ))}
      </div>
    </>
  );
}

function MobileNotesPanel({
  open,
  onMinimize,
  onCloseAll,
}: {
  open: boolean;
  onMinimize: () => void;
  onCloseAll: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="lg:hidden">
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/50 transition-opacity duration-300 ease-out motion-reduce:transition-none",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onMinimize}
        aria-hidden
      />

      <div
        className={cn(
          "fixed inset-0 z-[63] flex flex-col bg-background",
          "transition-transform duration-300 ease-out motion-reduce:transition-none",
          open ? "translate-y-0" : "pointer-events-none translate-y-full"
        )}
        role="dialog"
        aria-modal={open}
        aria-hidden={!open}
        aria-label={t("notes.dock.title")}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">{t("notes.dock.title")}</p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onMinimize}
              aria-label={t("notes.dock.minimize")}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onCloseAll}
              aria-label={t("notes.menu.closeAll")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <DockContent />
        </div>
      </div>
    </div>
  );
}

export default function NotesDock() {
  const { t } = useLanguage();
  const { isDockOpen, openNoteIds, setDockOpen, closeAllNotes } = useNotes();

  const hasOpenNotes = openNoteIds.length > 0;

  useEffect(() => {
    if (typeof window === "undefined" || !hasOpenNotes) return;

    const media = window.matchMedia("(max-width: 1023px)");
    const syncScrollLock = () => {
      if (media.matches && isDockOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    };

    syncScrollLock();
    media.addEventListener("change", syncScrollLock);
    return () => {
      media.removeEventListener("change", syncScrollLock);
      document.body.style.overflow = "";
    };
  }, [hasOpenNotes, isDockOpen]);

  if (!hasOpenNotes) return null;

  return (
    <>
      {/* Desktop dock */}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-[63] hidden w-80 flex-col border-l border-border bg-background shadow-xl lg:flex xl:w-96",
          !isDockOpen && "lg:hidden"
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">{t("notes.dock.title")}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={closeAllNotes}
            aria-label={t("notes.menu.closeAll")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <DockContent />
        </div>
      </aside>

      {/* Mobile — stays mounted when minimized so editors keep their state */}
      <MobileNotesPanel
        open={isDockOpen}
        onMinimize={() => setDockOpen(false)}
        onCloseAll={closeAllNotes}
      />

      {!isDockOpen && <NotesMobileBar />}
    </>
  );
}
