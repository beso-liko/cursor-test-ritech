"use client";

import NotesBubble from "@/components/notes/NotesBubble";
import NotesDock from "@/components/notes/NotesDock";
import NotesManager from "@/components/notes/NotesManager";

export default function NotesShell() {
  return (
    <>
      <NotesBubble />
      <NotesDock />
      <NotesManager />
    </>
  );
}
