"use client";

import { useState } from "react";
import { Pencil, Trash2, ExternalLink, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/LanguageProvider";
import { useNotes } from "@/components/notes/NotesProvider";
import type { Note } from "@/lib/supabase/types";

function formatDate(date: string, locale: string) {
  return new Date(date).toLocaleDateString(locale === "sq" ? "sq-AL" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotesManager() {
  const { t, locale } = useLanguage();
  const {
    notes,
    loading,
    isManagerOpen,
    setManagerOpen,
    createNote,
    openNote,
    deleteNote,
    updateNoteLocal,
  } = useNotes();

  const [renaming, setRenaming] = useState<Note | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<Note | null>(null);

  const handleRename = async () => {
    if (!renaming) return;
    const title = renameValue.trim() || "Untitled";
    const res = await fetch(`/api/notes/${renaming.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      const updated = (await res.json()) as Note;
      updateNoteLocal(renaming.id, updated);
    }
    setRenaming(null);
  };

  return (
    <>
      <Dialog open={isManagerOpen} onOpenChange={setManagerOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("notes.manager.title")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 overflow-hidden">
            <Button
              type="button"
              className="gap-2"
              onClick={async () => {
                const id = await createNote();
                if (id) setManagerOpen(false);
              }}
            >
              <Plus className="h-4 w-4" />
              <span>{t("notes.manager.create")}</span>
            </Button>

            <div className="max-h-[50vh] overflow-y-auto space-y-2">
              {loading && (
                <p className="text-sm text-muted-foreground">{t("notes.loading")}</p>
              )}
              {!loading && notes.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t("notes.manager.empty")}
                </p>
              )}
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center gap-2 rounded-xl border border-border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{note.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(note.updated_at, locale)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      openNote(note.id);
                      setManagerOpen(false);
                    }}
                    aria-label={t("notes.manager.open")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setRenaming(note);
                      setRenameValue(note.title);
                    }}
                    aria-label={t("notes.manager.rename")}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleting(note)}
                    aria-label={t("notes.manager.delete")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renaming} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("notes.manager.rename")}</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
          />
          <Button type="button" onClick={handleRename}>
            {t("notes.manager.save")}
          </Button>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("notes.manager.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("notes.manager.deleteConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("notes.manager.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleting) await deleteNote(deleting.id);
                setDeleting(null);
              }}
            >
              {t("notes.manager.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
