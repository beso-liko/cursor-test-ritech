"use client";

import { useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";
import type { DrawingStroke, Note } from "@/lib/supabase/types";
import { useNotes } from "@/components/notes/NotesProvider";
import NoteEditor from "@/components/notes/NoteEditor";

interface NotePanelProps {
  noteId: string;
  isActive: boolean;
}

function useDebouncedSave(noteId: string) {
  const { setSaveStatus, updateNoteLocal } = useNotes();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Partial<Note> | null>(null);

  const flush = useCallback(async () => {
    if (!pending.current) return;
    const payload = pending.current;
    pending.current = null;
    setSaveStatus(noteId, "saving");
    const res = await fetch(`/api/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = (await res.json()) as Note;
      updateNoteLocal(noteId, {
        title: updated.title,
        content: updated.content,
        drawing_data: updated.drawing_data,
        updated_at: updated.updated_at,
      });
      setSaveStatus(noteId, "saved");
      setTimeout(() => setSaveStatus(noteId, "idle"), 1500);
    } else {
      setSaveStatus(noteId, "idle");
    }
  }, [noteId, setSaveStatus, updateNoteLocal]);

  const scheduleSave = useCallback(
    (partial: Partial<Note>) => {
      pending.current = { ...pending.current, ...partial };

      if (partial.title !== undefined) {
        updateNoteLocal(noteId, { title: partial.title });
      }

      if (partial.content !== undefined) {
        updateNoteLocal(noteId, { content: partial.content });
      }

      if (partial.drawing_data !== undefined) {
        updateNoteLocal(noteId, { drawing_data: partial.drawing_data });
      }

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        flush();
      }, 800);
    },
    [noteId, flush, updateNoteLocal]
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      flush();
    },
    [flush]
  );

  return scheduleSave;
}

export default function NotePanel({ noteId, isActive }: NotePanelProps) {
  const { t } = useLanguage();
  const {
    notesById,
    closeNote,
    setFocusedNoteId,
    saveStatus,
    registerEditorInsert,
    unregisterEditorInsert,
  } = useNotes();

  const note = notesById[noteId];
  const scheduleSave = useDebouncedSave(noteId);

  const handleRegisterInsert = useCallback(
    (insert: (text: string) => void) => {
      registerEditorInsert(noteId, insert);
    },
    [noteId, registerEditorInsert]
  );

  useEffect(() => {
    return () => unregisterEditorInsert(noteId);
  }, [noteId, unregisterEditorInsert]);

  if (!note) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        {t("notes.loading")}
      </div>
    );
  }

  const status = saveStatus[noteId] ?? "idle";
  const strokes = (note.drawing_data ?? []) as DrawingStroke[];

  return (
    <div className={cn("flex h-full min-h-0 flex-col", !isActive && "hidden")}>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Input
          value={note.title}
          onChange={(e) => scheduleSave({ title: e.target.value })}
          onFocus={() => setFocusedNoteId(noteId)}
          className="h-8 flex-1 border-none bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0"
          placeholder={t("notes.untitled")}
        />
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {status === "saving" && t("notes.saving")}
          {status === "saved" && t("notes.saved")}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => closeNote(noteId)}
          aria-label={t("notes.close")}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <NoteEditor
          noteId={noteId}
          isActive={isActive}
          content={note.content}
          onChange={(content) => scheduleSave({ content })}
          strokes={strokes}
          onDrawingChange={(drawing_data) => scheduleSave({ drawing_data })}
          onRegisterInsert={handleRegisterInsert}
          onFocus={() => setFocusedNoteId(noteId)}
        />
      </div>
    </div>
  );
}
