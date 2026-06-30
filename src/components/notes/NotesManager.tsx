"use client";

import { useMemo, useState } from "react";
import {
  ExternalLink,
  Folder,
  FolderPlus,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
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
import CreateFolderDialog from "@/components/CreateFolderDialog";
import NoteMoveMenu from "@/components/notes/NoteMoveMenu";
import { useLanguage } from "@/components/LanguageProvider";
import { useNotes } from "@/components/notes/NotesProvider";
import type { Note, NoteFolder } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type FolderFilter = "all" | "unfiled" | string;

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
    folders,
    loading,
    isManagerOpen,
    setManagerOpen,
    createNote,
    openNote,
    deleteNote,
    updateNoteLocal,
    createFolder,
    renameFolder,
    deleteFolder,
    moveNoteToFolder,
  } = useNotes();

  const [folderFilter, setFolderFilter] = useState<FolderFilter>("all");
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renamingFolder, setRenamingFolder] = useState<NoteFolder | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<NoteFolder | null>(null);
  const [renaming, setRenaming] = useState<Note | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleting, setDeleting] = useState<Note | null>(null);

  const filteredNotes = useMemo(() => {
    if (folderFilter === "all") return notes;
    if (folderFilter === "unfiled") return notes.filter((note) => !note.folder_id);
    return notes.filter((note) => note.folder_id === folderFilter);
  }, [notes, folderFilter]);

  const createFolderId =
    folderFilter !== "all" && folderFilter !== "unfiled" ? folderFilter : null;

  const selectedFolder =
    folderFilter !== "all" && folderFilter !== "unfiled"
      ? folders.find((folder) => folder.id === folderFilter)
      : null;

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
        <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("notes.manager.title")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 overflow-hidden">
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              <button
                type="button"
                onClick={() => setFolderFilter("all")}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  folderFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {t("notes.folders.all")}
              </button>
              <button
                type="button"
                onClick={() => setFolderFilter("unfiled")}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  folderFilter === "unfiled"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {t("notes.folders.unfiled")}
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setFolderFilter(folder.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    folderFilter === folder.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Folder className="h-3 w-3 shrink-0" />
                  <span className="max-w-[8rem] truncate">{folder.name}</span>
                </button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 rounded-full h-auto px-3 py-1.5 text-xs"
                onClick={() => setCreateFolderOpen(true)}
              >
                <FolderPlus className="h-3 w-3" />
                <span className="hidden sm:inline">{t("notes.folders.new")}</span>
              </Button>
            </div>

            {selectedFolder && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2">
                <div className="min-w-0 flex items-center gap-2">
                  <Folder className="h-4 w-4 shrink-0 text-amber-500" />
                  <span className="truncate text-sm font-medium">{selectedFolder.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setRenamingFolder(selectedFolder)}
                    aria-label={t("notes.folders.rename")}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeletingFolder(selectedFolder)}
                    aria-label={t("notes.folders.delete")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            <Button
              type="button"
              className="gap-2"
              onClick={async () => {
                const id = await createNote(createFolderId);
                if (id) setManagerOpen(false);
              }}
            >
              <Plus className="h-4 w-4" />
              <span>{t("notes.manager.create")}</span>
            </Button>

            <div className="max-h-[45vh] overflow-y-auto space-y-2">
              {loading && (
                <p className="text-sm text-muted-foreground">{t("notes.loading")}</p>
              )}
              {!loading && filteredNotes.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t("notes.manager.empty")}
                </p>
              )}
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center gap-2 rounded-xl border border-border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{note.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(note.updated_at, locale)}
                      {note.folder_id && foldersByIdName(folders, note.folder_id) && (
                        <>
                          {" · "}
                          {foldersByIdName(folders, note.folder_id)}
                        </>
                      )}
                    </p>
                  </div>
                  <NoteMoveMenu
                    folders={folders}
                    currentFolderId={note.folder_id}
                    onMove={(folderId) => moveNoteToFolder(note.id, folderId)}
                    moveToLabel={t("notes.manager.moveTo")}
                    removeLabel={t("notes.manager.removeFromFolder")}
                    triggerLabel={t("notes.manager.move")}
                  />
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

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        title={t("notes.folders.createTitle")}
        submitLabel={t("notes.folders.createSubmit")}
        onSubmit={async (name) => {
          const folder = await createFolder(name);
          if (folder) setFolderFilter(folder.id);
        }}
      />

      <CreateFolderDialog
        open={!!renamingFolder}
        onOpenChange={(open) => !open && setRenamingFolder(null)}
        initialName={renamingFolder?.name ?? ""}
        title={t("notes.folders.renameTitle")}
        submitLabel={t("notes.folders.renameSubmit")}
        onSubmit={async (name) => {
          if (renamingFolder) await renameFolder(renamingFolder.id, name);
        }}
      />

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

      <AlertDialog
        open={!!deletingFolder}
        onOpenChange={(open) => !open && setDeletingFolder(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("notes.folders.deleteTitle").replace("{name}", deletingFolder?.name ?? "")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("notes.folders.deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("notes.manager.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deletingFolder) {
                  await deleteFolder(deletingFolder.id);
                  if (folderFilter === deletingFolder.id) {
                    setFolderFilter("all");
                  }
                }
                setDeletingFolder(null);
              }}
            >
              {t("notes.folders.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function foldersByIdName(folders: NoteFolder[], folderId: string) {
  return folders.find((folder) => folder.id === folderId)?.name;
}
