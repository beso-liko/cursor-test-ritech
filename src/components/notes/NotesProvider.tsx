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
import type { Note } from "@/lib/supabase/types";

export const MAX_OPEN_NOTES = 6;
const OPEN_NOTES_KEY = "studybuddy-open-notes";

type SaveStatus = "idle" | "saving" | "saved";
type InsertHandler = (text: string) => void;

interface NotesContextValue {
  notes: Note[];
  notesById: Record<string, Note>;
  openNoteIds: string[];
  focusedNoteId: string | null;
  isDockOpen: boolean;
  isManagerOpen: boolean;
  saveStatus: Record<string, SaveStatus>;
  maxNotesToast: string | null;
  loading: boolean;
  refreshNotes: () => Promise<void>;
  createNote: () => Promise<string | null>;
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

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [openNoteIds, setOpenNoteIds] = useState<string[]>([]);
  const [focusedNoteId, setFocusedNoteId] = useState<string | null>(null);
  const [isDockOpen, setDockOpen] = useState(false);
  const [isManagerOpen, setManagerOpen] = useState(false);
  const [saveStatus, setSaveStatusState] = useState<Record<string, SaveStatus>>({});
  const [maxNotesToast, setMaxNotesToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const insertHandlers = useRef<Map<string, InsertHandler>>(new Map());
  const hydrated = useRef(false);

  const notesById = useMemo(
    () => Object.fromEntries(notes.map((note) => [note.id, note])),
    [notes]
  );

  const refreshNotes = useCallback(async () => {
    const res = await fetch("/api/notes");
    if (!res.ok) return;
    const data = (await res.json()) as Note[];
    setNotes(data);
  }, []);

  useEffect(() => {
    refreshNotes().finally(() => setLoading(false));
  }, [refreshNotes]);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const stored = readStoredOpenIds();
    if (stored.length > 0) {
      setOpenNoteIds(stored);
      setFocusedNoteId(stored[stored.length - 1] ?? null);
      setDockOpen(true);
    }
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
    if (typeof window === "undefined") return;
    sessionStorage.setItem(OPEN_NOTES_KEY, JSON.stringify(openNoteIds));
  }, [openNoteIds]);

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

  const createNote = useCallback(async () => {
    if (openNoteIds.length >= MAX_OPEN_NOTES) {
      setMaxNotesToast("max");
      return null;
    }

    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled" }),
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

  const clearMaxNotesToast = useCallback(() => setMaxNotesToast(null), []);

  const value = useMemo<NotesContextValue>(
    () => ({
      notes,
      notesById,
      openNoteIds,
      focusedNoteId,
      isDockOpen,
      isManagerOpen,
      saveStatus,
      maxNotesToast,
      loading,
      refreshNotes,
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
      clearMaxNotesToast,
    }),
    [
      notes,
      notesById,
      openNoteIds,
      focusedNoteId,
      isDockOpen,
      isManagerOpen,
      saveStatus,
      maxNotesToast,
      loading,
      refreshNotes,
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
