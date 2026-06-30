"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Note, NoteFolder } from "@/lib/supabase/types";

export const MAX_OPEN_NOTES = 6;
const OPEN_NOTES_KEY = "studybuddy-open-notes";
const DOCK_OPEN_KEY = "studybuddy-notes-dock-open";
const FOCUSED_NOTE_KEY = "studybuddy-notes-focused-id";

type SaveStatus = "idle" | "saving" | "saved";
type InsertHandler = (text: string) => void;

interface NotesContextValue {
  notes: Note[];
  notesById: Record<string, Note>;
  folders: NoteFolder[];
  foldersById: Record<string, NoteFolder>;
  openNoteIds: string[];
  focusedNoteId: string | null;
  isDockOpen: boolean;
  isManagerOpen: boolean;
  saveStatus: Record<string, SaveStatus>;
  maxNotesToast: string | null;
  loading: boolean;
  refreshNotes: () => Promise<void>;
  refreshFolders: () => Promise<void>;
  createNote: (folderId?: string | null) => Promise<string | null>;
  openNote: (id: string) => Promise<void>;
  closeNote: (id: string) => void;
  closeAllNotes: () => void;
  setFocusedNoteId: (id: string) => void;
  setManagerOpen: (open: boolean) => void;
  setDockOpen: (open: boolean) => void;
  updateNoteLocal: (id: string, partial: Partial<Note>) => void;
  setSaveStatus: (id: string, status: SaveStatus) => void;
  insertIntoFocusedNote: (text: string) => void;
  registerEditorInsert: (noteId: string, handler: InsertHandler) => void;
  unregisterEditorInsert: (noteId: string) => void;
  deleteNote: (id: string) => Promise<boolean>;
  createFolder: (name: string) => Promise<NoteFolder | null>;
  renameFolder: (id: string, name: string) => Promise<boolean>;
  deleteFolder: (id: string) => Promise<boolean>;
  moveNoteToFolder: (noteId: string, folderId: string | null) => Promise<boolean>;
  clearMaxNotesToast: () => void;
}

const NotesContext = createContext<NotesContextValue | null>(null);

function readStoredOpenIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(OPEN_NOTES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_OPEN_NOTES) : [];
  } catch {
    return [];
  }
}

function readStoredDockOpen(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DOCK_OPEN_KEY);
    if (raw == null) return null;
    return JSON.parse(raw) === true;
  } catch {
    return null;
  }
}

function readStoredFocusedId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(FOCUSED_NOTE_KEY);
  } catch {
    return null;
  }
}

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [openNoteIds, setOpenNoteIds] = useState<string[]>([]);
  const [focusedNoteId, setFocusedNoteId] = useState<string | null>(null);
  const [isDockOpen, setDockOpen] = useState(false);
  const [isManagerOpen, setManagerOpen] = useState(false);
  const [saveStatus, setSaveStatusState] = useState<Record<string, SaveStatus>>({});
  const [maxNotesToast, setMaxNotesToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const insertHandlers = useRef<Map<string, InsertHandler>>(new Map());
  const [storageReady, setStorageReady] = useState(false);

  const notesById = useMemo(
    () => Object.fromEntries(notes.map((note) => [note.id, note])),
    [notes]
  );

  const foldersById = useMemo(
    () => Object.fromEntries(folders.map((folder) => [folder.id, folder])),
    [folders]
  );

  const refreshNotes = useCallback(async () => {
    const res = await fetch("/api/notes");
    if (!res.ok) return;
    const data = (await res.json()) as Note[];
    setNotes(
      data.map((note) => ({
        ...note,
        folder_id: note.folder_id ?? null,
      }))
    );
  }, []);

  const refreshFolders = useCallback(async () => {
    const res = await fetch("/api/note-folders");
    if (!res.ok) return;
    const data = (await res.json()) as NoteFolder[];
    setFolders(data);
  }, []);

  useEffect(() => {
    Promise.all([refreshNotes(), refreshFolders()]).finally(() => setLoading(false));
  }, [refreshNotes, refreshFolders]);

  useEffect(() => {
    const stored = readStoredOpenIds();
    if (stored.length > 0) {
      const storedFocused = readStoredFocusedId();
      const validFocused =
        storedFocused && stored.includes(storedFocused)
          ? storedFocused
          : (stored[stored.length - 1] ?? null);
      setOpenNoteIds(stored);
      setFocusedNoteId(validFocused);
      const storedDockOpen = readStoredDockOpen();
      setDockOpen(storedDockOpen ?? true);
    }
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (loading || openNoteIds.length === 0) return;
    const missing = openNoteIds.filter((id) => !notesById[id]);
    if (missing.length === 0) return;

    Promise.all(
      missing.map(async (id) => {
        const res = await fetch(`/api/notes/${id}`);
        if (!res.ok) return null;
        return (await res.json()) as Note;
      })
    ).then((fetched) => {
      const valid = fetched.filter(Boolean) as Note[];
      if (valid.length === 0) return;
      setNotes((prev) => {
        const map = new Map(prev.map((note) => [note.id, note]));
        valid.forEach((note) => map.set(note.id, note));
        return Array.from(map.values()).sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      });
    });
  }, [loading, openNoteIds, notesById]);

  useEffect(() => {
    if (!storageReady || typeof window === "undefined") return;
    sessionStorage.setItem(OPEN_NOTES_KEY, JSON.stringify(openNoteIds));
  }, [openNoteIds, storageReady]);

  useEffect(() => {
    if (!storageReady || typeof window === "undefined") return;
    sessionStorage.setItem(DOCK_OPEN_KEY, JSON.stringify(isDockOpen));
  }, [isDockOpen, storageReady]);

  useEffect(() => {
    if (!storageReady || typeof window === "undefined") return;
    if (focusedNoteId) {
      sessionStorage.setItem(FOCUSED_NOTE_KEY, focusedNoteId);
    } else {
      sessionStorage.removeItem(FOCUSED_NOTE_KEY);
    }
  }, [focusedNoteId, storageReady]);

  const setSaveStatus = useCallback((id: string, status: SaveStatus) => {
    setSaveStatusState((prev) => ({ ...prev, [id]: status }));
  }, []);

  const updateNoteLocal = useCallback((id: string, partial: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, ...partial } : note))
    );
  }, []);

  const openNote = useCallback(
    async (id: string) => {
      if (!notesById[id]) {
        const res = await fetch(`/api/notes/${id}`);
        if (res.ok) {
          const note = (await res.json()) as Note;
          setNotes((prev) => [note, ...prev.filter((n) => n.id !== note.id)]);
        }
      }

      setOpenNoteIds((prev) => {
        if (prev.includes(id)) return prev;
        if (prev.length >= MAX_OPEN_NOTES) {
          setMaxNotesToast("max");
          return prev;
        }
        return [...prev, id];
      });
      setFocusedNoteId(id);
      setDockOpen(true);
    },
    [notesById]
  );

  const createNote = useCallback(async (folderId?: string | null) => {
    if (openNoteIds.length >= MAX_OPEN_NOTES) {
      setMaxNotesToast("max");
      return null;
    }

    const body: Record<string, unknown> = { title: "Untitled" };
    if (folderId) {
      body.folder_id = folderId;
    }

    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) return null;
    const note = (await res.json()) as Note;
    setNotes((prev) => [note, ...prev.filter((n) => n.id !== note.id)]);
    setOpenNoteIds((prev) => [...prev, note.id]);
    setFocusedNoteId(note.id);
    setDockOpen(true);
    return note.id;
  }, [openNoteIds.length]);

  const closeNote = useCallback((id: string) => {
    setOpenNoteIds((prev) => {
      const next = prev.filter((noteId) => noteId !== id);
      setFocusedNoteId((current) => {
        if (current !== id) return current;
        return next[next.length - 1] ?? null;
      });
      if (next.length === 0) setDockOpen(false);
      return next;
    });
  }, []);

  const closeAllNotes = useCallback(() => {
    setOpenNoteIds([]);
    setFocusedNoteId(null);
    setDockOpen(false);
  }, []);

  const registerEditorInsert = useCallback((noteId: string, handler: InsertHandler) => {
    insertHandlers.current.set(noteId, handler);
  }, []);

  const unregisterEditorInsert = useCallback((noteId: string) => {
    insertHandlers.current.delete(noteId);
  }, []);

  const insertIntoFocusedNote = useCallback(
    (text: string) => {
      const targetId = focusedNoteId ?? openNoteIds[openNoteIds.length - 1];
      if (!targetId) return;
      const handler = insertHandlers.current.get(targetId);
      handler?.(text);
    },
    [focusedNoteId, openNoteIds]
  );

  const deleteNote = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!res.ok) return false;
      setNotes((prev) => prev.filter((note) => note.id !== id));
      closeNote(id);
      return true;
    },
    [closeNote]
  );

  const createFolder = useCallback(async (name: string) => {
    const res = await fetch("/api/note-folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return null;
    const folder = (await res.json()) as NoteFolder;
    setFolders((prev) =>
      [...prev.filter((f) => f.id !== folder.id), folder].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    );
    return folder;
  }, []);

  const renameFolder = useCallback(async (id: string, name: string) => {
    const res = await fetch(`/api/note-folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return false;
    const updated = (await res.json()) as NoteFolder;
    setFolders((prev) =>
      prev
        .map((folder) => (folder.id === id ? updated : folder))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
    return true;
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    const res = await fetch(`/api/note-folders/${id}`, { method: "DELETE" });
    if (!res.ok) return false;
    setFolders((prev) => prev.filter((folder) => folder.id !== id));
    setNotes((prev) =>
      prev.map((note) =>
        note.folder_id === id ? { ...note, folder_id: null } : note
      )
    );
    return true;
  }, []);

  const moveNoteToFolder = useCallback(
    async (noteId: string, folderId: string | null) => {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: folderId }),
      });
      if (!res.ok) return false;
      const updated = (await res.json()) as Note;
      updateNoteLocal(noteId, {
        folder_id: updated.folder_id,
        updated_at: updated.updated_at,
      });
      return true;
    },
    [updateNoteLocal]
  );

  const clearMaxNotesToast = useCallback(() => setMaxNotesToast(null), []);

  const value = useMemo<NotesContextValue>(
    () => ({
      notes,
      notesById,
      folders,
      foldersById,
      openNoteIds,
      focusedNoteId,
      isDockOpen,
      isManagerOpen,
      saveStatus,
      maxNotesToast,
      loading,
      refreshNotes,
      refreshFolders,
      createNote,
      openNote,
      closeNote,
      closeAllNotes,
      setFocusedNoteId,
      setManagerOpen,
      setDockOpen,
      updateNoteLocal,
      setSaveStatus,
      insertIntoFocusedNote,
      registerEditorInsert,
      unregisterEditorInsert,
      deleteNote,
      createFolder,
      renameFolder,
      deleteFolder,
      moveNoteToFolder,
      clearMaxNotesToast,
    }),
    [
      notes,
      notesById,
      folders,
      foldersById,
      openNoteIds,
      focusedNoteId,
      isDockOpen,
      isManagerOpen,
      saveStatus,
      maxNotesToast,
      loading,
      refreshNotes,
      refreshFolders,
      createNote,
      openNote,
      closeNote,
      closeAllNotes,
      updateNoteLocal,
      setSaveStatus,
      insertIntoFocusedNote,
      registerEditorInsert,
      unregisterEditorInsert,
      deleteNote,
      createFolder,
      renameFolder,
      deleteFolder,
      moveNoteToFolder,
      clearMaxNotesToast,
    ]
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used within NotesProvider");
  return ctx;
}

export function useNotesOptional() {
  return useContext(NotesContext);
}
