"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Highlighter,
  Table as TableIcon,
  Undo2,
  Redo2,
  PenLine,
  Eraser,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";
import { DRAWING_COLORS } from "@/components/notes/NoteDrawingCanvas";

const HIGHLIGHT_COLORS = [
  { label: "yellow", color: "#fef08a" },
  { label: "green", color: "#bbf7d0" },
  { label: "blue", color: "#bfdbfe" },
  { label: "pink", color: "#fbcfe8" },
];

type DrawMode = "pen" | "eraser" | null;

interface NoteToolbarProps {
  editor: Editor;
  drawMode: DrawMode;
  drawColor: string;
  onDrawModeChange: (mode: DrawMode) => void;
  onDrawColorChange: (color: string) => void;
  onClearDrawing: () => void;
  onFocusEditor: () => void;
  onInsertTable: () => void;
}

export default function NoteToolbar({
  editor,
  drawMode,
  drawColor,
  onDrawModeChange,
  onDrawColorChange,
  onClearDrawing,
  onFocusEditor,
  onInsertTable,
}: NoteToolbarProps) {
  const { t } = useLanguage();
  const [, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRevision((n) => n + 1);
    editor.on("selectionUpdate", refresh);
    editor.on("transaction", refresh);
    return () => {
      editor.off("selectionUpdate", refresh);
      editor.off("transaction", refresh);
    };
  }, [editor]);

  const toolbarBtn = (active: boolean) =>
    cn("h-7 w-7 shrink-0", active && "bg-primary text-primary-foreground");

  const isDrawing = drawMode !== null;

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto border-b border-border px-2 py-1.5">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={toolbarBtn(editor.isActive("bold") && !isDrawing)}
        onClick={() => {
          onFocusEditor();
          editor.chain().focus().toggleBold().run();
        }}
        aria-label={t("notes.toolbar.bold")}
      >
        <Bold className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={toolbarBtn(editor.isActive("italic") && !isDrawing)}
        onClick={() => {
          onFocusEditor();
          editor.chain().focus().toggleItalic().run();
        }}
        aria-label={t("notes.toolbar.italic")}
      >
        <Italic className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={toolbarBtn(editor.isActive("underline") && !isDrawing)}
        onClick={() => {
          onFocusEditor();
          editor.chain().focus().toggleUnderline().run();
        }}
        aria-label={t("notes.toolbar.underline")}
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </Button>
      {HIGHLIGHT_COLORS.map(({ label, color }) => (
        <button
          key={label}
          type="button"
          className={cn(
            "h-5 w-5 shrink-0 rounded border",
            editor.isActive("highlight", { color }) &&
              !isDrawing &&
              "ring-2 ring-primary"
          )}
          style={{ backgroundColor: color }}
          onClick={() => {
            onFocusEditor();
            editor.chain().focus().toggleHighlight({ color }).run();
          }}
          aria-label={t("notes.toolbar.highlight")}
        />
      ))}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={toolbarBtn(false)}
        onClick={() => {
          onFocusEditor();
          onInsertTable();
        }}
        aria-label={t("notes.toolbar.table")}
      >
        <TableIcon className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={toolbarBtn(false)}
        onClick={() => {
          onFocusEditor();
          editor.chain().focus().undo().run();
        }}
        disabled={!editor.can().undo()}
        aria-label={t("notes.toolbar.undo")}
      >
        <Undo2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className={toolbarBtn(false)}
        onClick={() => {
          onFocusEditor();
          editor.chain().focus().redo().run();
        }}
        disabled={!editor.can().redo()}
        aria-label={t("notes.toolbar.redo")}
      >
        <Redo2 className="h-3.5 w-3.5" />
      </Button>

      <div className="mx-0.5 h-5 w-px shrink-0 bg-border" aria-hidden />

      <Button
        type="button"
        variant={drawMode === "pen" ? "default" : "ghost"}
        size="icon-sm"
        className={cn("h-7 w-7 shrink-0", drawMode !== "pen" && "opacity-80")}
        onClick={() =>
          onDrawModeChange(drawMode === "pen" ? null : "pen")
        }
        aria-label={t("notes.draw.pen")}
      >
        <PenLine className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant={drawMode === "eraser" ? "default" : "ghost"}
        size="icon-sm"
        className={cn(
          "h-7 w-7 shrink-0",
          drawMode !== "eraser" && "opacity-80"
        )}
        onClick={() =>
          onDrawModeChange(drawMode === "eraser" ? null : "eraser")
        }
        aria-label={t("notes.draw.eraser")}
      >
        <Eraser className="h-3.5 w-3.5" />
      </Button>
      {DRAWING_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => {
            onDrawColorChange(c);
            onDrawModeChange("pen");
          }}
          className={cn(
            "h-5 w-5 shrink-0 rounded-full border-2",
            drawColor === c && drawMode === "pen"
              ? "border-primary"
              : "border-transparent"
          )}
          style={{ backgroundColor: c }}
          aria-label={t("notes.draw.color")}
        />
      ))}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="ml-auto h-7 w-7 shrink-0"
        onClick={onClearDrawing}
        aria-label={t("notes.draw.clear")}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
