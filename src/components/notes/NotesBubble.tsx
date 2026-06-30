"use client";

import { useEffect, useRef, useState } from "react";
import {
  StickyNote,
  Plus,
  FolderOpen,
  XCircle,
  PanelBottomOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";
import { useNotes } from "@/components/notes/NotesProvider";

export default function NotesBubble() {
  const { t } = useLanguage();
  const {
    createNote,
    setManagerOpen,
    setDockOpen,
    closeAllNotes,
    openNoteIds,
    isDockOpen,
    maxNotesToast,
    clearMaxNotesToast,
  } = useNotes();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!maxNotesToast) return;
    const timer = setTimeout(clearMaxNotesToast, 3000);
    return () => clearTimeout(timer);
  }, [maxNotesToast, clearMaxNotesToast]);

  const hasMinimizedNotes = openNoteIds.length > 0 && !isDockOpen;

  const menuItems = [
    {
      icon: PanelBottomOpen,
      label: t("notes.menu.openDock"),
      action: () => {
        setDockOpen(true);
        setOpen(false);
      },
      hidden: !hasMinimizedNotes,
    },
    {
      icon: Plus,
      label: t("notes.menu.create"),
      action: async () => {
        await createNote();
        setOpen(false);
      },
    },
    {
      icon: FolderOpen,
      label: t("notes.menu.view"),
      action: () => {
        setManagerOpen(true);
        setOpen(false);
      },
    },
    {
      icon: XCircle,
      label: t("notes.menu.closeAll"),
      action: () => {
        closeAllNotes();
        setOpen(false);
      },
      disabled: openNoteIds.length === 0,
    },
  ];

  const dockOpen = isDockOpen && openNoteIds.length > 0;

  return (
    <div
      ref={menuRef}
      className={cn(
        "fixed top-[4.5rem] right-4 z-[64] transition-[right] duration-200 lg:top-4",
        dockOpen && "lg:right-[21rem] xl:right-[25rem]"
      )}
    >
      {maxNotesToast && (
        <div className="absolute right-0 bottom-full mb-2 w-48 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
          {t("notes.maxOpen")}
        </div>
      )}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          {menuItems
            .filter((item) => !item.hidden)
            .map(({ icon: Icon, label, action, disabled }) => (
            <button
              key={label}
              type="button"
              disabled={disabled}
              onClick={action}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent",
                disabled && "cursor-not-allowed opacity-50"
              )}
            >
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
      <Button
        type="button"
        size="icon"
        className="relative h-10 w-10 rounded-full shadow-lg"
        onClick={() => {
          if (hasMinimizedNotes && !open) {
            setDockOpen(true);
            return;
          }
          setOpen((prev) => !prev);
        }}
        aria-label={t("notes.bubble.label")}
        aria-expanded={open}
      >
        <StickyNote className="h-4 w-4" />
        {hasMinimizedNotes && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {openNoteIds.length}
          </span>
        )}
      </Button>
    </div>
  );
}
