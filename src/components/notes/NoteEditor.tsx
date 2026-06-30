"use client";

import { useEffect, useCallback, useRef, useState, memo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { cn } from "@/lib/utils";
import type { DrawingStroke } from "@/lib/supabase/types";
import {
  NoteDrawingOverlay,
  DRAWING_COLORS,
} from "@/components/notes/NoteDrawingCanvas";
import NoteToolbar from "@/components/notes/NoteToolbar";
import TableSizeDialog, {
  type TableSizeDialogMode,
} from "@/components/notes/TableSizeDialog";
import TableOptionsMenu from "@/components/notes/TableOptionsMenu";
import { NoteTable } from "@/components/notes/NoteTableExtension";
import { NoteTableView } from "@/components/notes/NoteTableView";
import { setNoteTableMenuHandler } from "@/lib/notes/note-table-edit";
import { deleteTable, resizeTable } from "@/lib/notes/table-utils";

interface NoteEditorProps {
  noteId: string;
  isActive: boolean;
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  strokes: DrawingStroke[];
  onDrawingChange: (strokes: DrawingStroke[]) => void;
  onRegisterInsert: (insert: (text: string) => void) => void;
  onFocus?: () => void;
}

type DrawMode = "pen" | "eraser" | null;

const MemoDrawingOverlay = memo(NoteDrawingOverlay);

interface TableDialogState {
  open: boolean;
  mode: TableSizeDialogMode;
  rows: number;
  cols: number;
  tablePos?: number;
}

interface TableMenuState {
  tablePos: number;
  rows: number;
  cols: number;
  anchorRect: DOMRect;
}

export default function NoteEditor({
  noteId,
  isActive,
  content,
  onChange,
  strokes,
  onDrawingChange,
  onRegisterInsert,
  onFocus,
}: NoteEditorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const areaHeightRef = useRef(200);
  const onChangeRef = useRef(onChange);
  const onFocusRef = useRef(onFocus);
  const drawModeRef = useRef<DrawMode>(null);
  const lastExternalContentRef = useRef<string>(
    JSON.stringify(content)
  );
  const pendingLocalContentRef = useRef<string | null>(null);
  const noteIdRef = useRef(noteId);
  const heightRafRef = useRef<number | null>(null);

  const [areaHeight, setAreaHeight] = useState(200);
  const [drawMode, setDrawMode] = useState<DrawMode>(null);
  const [drawColor, setDrawColor] = useState(DRAWING_COLORS[0]);
  const [tableDialog, setTableDialog] = useState<TableDialogState>({
    open: false,
    mode: "create",
    rows: 3,
    cols: 3,
  });
  const tableDialogRef = useRef(tableDialog);
  tableDialogRef.current = tableDialog;
  const [tableMenu, setTableMenu] = useState<TableMenuState | null>(null);

  onChangeRef.current = onChange;
  onFocusRef.current = onFocus;
  drawModeRef.current = drawMode;

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Highlight.configure({ multicolor: true }),
      NoteTable.configure({ resizable: false, View: NoteTableView }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: Object.keys(content).length ? content : undefined,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none px-3 py-2 focus:outline-none text-sm",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const json = ed.getJSON() as Record<string, unknown>;
      pendingLocalContentRef.current = JSON.stringify(json);
      onChangeRef.current(json);
    },
    onFocus: () => {
      if (!drawModeRef.current) onFocusRef.current?.();
    },
  });

  const setAreaHeightIfChanged = useCallback((next: number) => {
    const clamped = Math.max(200, next);
    if (clamped === areaHeightRef.current) return;
    areaHeightRef.current = clamped;
    setAreaHeight(clamped);
  }, []);

  const updateAreaHeight = useCallback(() => {
    const scrollEl = scrollRef.current;
    const editorEl = editor?.view.dom;
    const viewportH = scrollEl?.clientHeight ?? 200;
    const editorH = editorEl?.scrollHeight ?? 200;
    setAreaHeightIfChanged(Math.max(viewportH, editorH));
  }, [editor, setAreaHeightIfChanged]);

  const scheduleAreaHeightUpdate = useCallback(() => {
    if (heightRafRef.current !== null) return;
    heightRafRef.current = requestAnimationFrame(() => {
      heightRafRef.current = null;
      updateAreaHeight();
    });
  }, [updateAreaHeight]);

  const handleExtendHeight = useCallback(
    (height: number) => {
      setAreaHeightIfChanged(Math.max(areaHeightRef.current, height));
    },
    [setAreaHeightIfChanged]
  );

  useEffect(() => {
    if (!editor) return;
    editor.view.dom.style.minHeight = `${areaHeight}px`;
  }, [editor, areaHeight]);

  useEffect(() => {
    if (!editor) return;
    editor.view.dom.classList.toggle("note-editor-drawing", drawMode !== null);
  }, [editor, drawMode]);

  useEffect(() => {
    if (!editor) return;
    scheduleAreaHeightUpdate();
    editor.on("update", scheduleAreaHeightUpdate);

    const roEditor = new ResizeObserver(scheduleAreaHeightUpdate);
    roEditor.observe(editor.view.dom);

    return () => {
      editor.off("update", scheduleAreaHeightUpdate);
      roEditor.disconnect();
    };
  }, [editor, scheduleAreaHeightUpdate]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const roScroll = new ResizeObserver(scheduleAreaHeightUpdate);
    roScroll.observe(scrollEl);
    scheduleAreaHeightUpdate();
    return () => roScroll.disconnect();
  }, [scheduleAreaHeightUpdate]);

  const insertText = useCallback(
    (text: string) => {
      if (!editor) return;
      setDrawMode(null);
      editor.chain().focus().insertContent(`<p>${text}</p>`).run();
    },
    [editor]
  );

  useEffect(() => {
    onRegisterInsert(insertText);
  }, [insertText, onRegisterInsert]);

  const pushEditorContent = useCallback(() => {
    if (!editor) return;
    const json = editor.getJSON() as Record<string, unknown>;
    pendingLocalContentRef.current = JSON.stringify(json);
    onChangeRef.current(json);
  }, [editor]);

  useEffect(() => {
    if (!isActive) return;
    setNoteTableMenuHandler(({ tablePos, rows, cols, anchorRect }) => {
      setTableMenu({ tablePos, rows, cols, anchorRect });
    });
    return () => setNoteTableMenuHandler(null);
  }, [isActive]);

  useEffect(() => {
    if (!isActive) setTableMenu(null);
  }, [isActive]);

  const handleTableEditSize = useCallback(() => {
    if (!tableMenu) return;
    setTableDialog({
      open: true,
      mode: "edit",
      rows: tableMenu.rows,
      cols: tableMenu.cols,
      tablePos: tableMenu.tablePos,
    });
    setTableMenu(null);
  }, [tableMenu]);

  const handleTableDelete = useCallback(() => {
    if (!editor || !tableMenu) return;
    const deleted = deleteTable(editor, tableMenu.tablePos);
    if (deleted) {
      pushEditorContent();
      editor.chain().focus().run();
      scheduleAreaHeightUpdate();
    }
    setTableMenu(null);
  }, [editor, tableMenu, pushEditorContent, scheduleAreaHeightUpdate]);

  const openCreateTableDialog = useCallback(() => {
    setDrawMode(null);
    setTableDialog({
      open: true,
      mode: "create",
      rows: 3,
      cols: 3,
    });
  }, []);

  const handleTableSizeConfirm = useCallback(
    (rows: number, cols: number) => {
      if (!editor) return;
      const dialog = tableDialogRef.current;
      if (dialog.mode === "create") {
        editor
          .chain()
          .focus()
          .insertTable({ rows, cols, withHeaderRow: true })
          .run();
      } else if (dialog.tablePos != null) {
        const resized = resizeTable(editor, dialog.tablePos, rows, cols);
        if (resized) {
          pushEditorContent();
        }
        editor.chain().focus().run();
      }
      scheduleAreaHeightUpdate();
    },
    [editor, scheduleAreaHeightUpdate, pushEditorContent]
  );

  // Sync external content only when switching notes or receiving remote updates
  useEffect(() => {
    if (!editor) return;

    if (noteIdRef.current !== noteId) {
      noteIdRef.current = noteId;
      pendingLocalContentRef.current = null;
      const incoming = JSON.stringify(content);
      lastExternalContentRef.current = incoming;
      if (Object.keys(content).length > 0) {
        editor.commands.setContent(content, { emitUpdate: false });
      } else {
        editor.commands.clearContent(true);
      }
      scheduleAreaHeightUpdate();
      return;
    }

    const incoming = JSON.stringify(content);

    if (
      pendingLocalContentRef.current != null &&
      incoming === pendingLocalContentRef.current
    ) {
      pendingLocalContentRef.current = null;
      lastExternalContentRef.current = incoming;
      return;
    }

    if (incoming === lastExternalContentRef.current) {
      return;
    }

    if (editor.isFocused) {
      lastExternalContentRef.current = incoming;
      return;
    }

    const current = JSON.stringify(editor.getJSON());
    if (incoming === current) {
      lastExternalContentRef.current = incoming;
      return;
    }

    lastExternalContentRef.current = incoming;

    if (Object.keys(content).length > 0) {
      editor.commands.setContent(content, { emitUpdate: false });
      scheduleAreaHeightUpdate();
    }
  }, [content, editor, noteId, scheduleAreaHeightUpdate]);

  const focusEditor = useCallback(() => {
    setDrawMode(null);
    editor?.chain().focus().run();
  }, [editor]);

  if (!editor) return null;

  const isDrawing = drawMode !== null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <NoteToolbar
        editor={editor}
        drawMode={drawMode}
        drawColor={drawColor}
        onDrawModeChange={setDrawMode}
        onDrawColorChange={setDrawColor}
        onClearDrawing={() => onDrawingChange([])}
        onFocusEditor={focusEditor}
        onInsertTable={openCreateTableDialog}
      />

      <TableOptionsMenu
        open={tableMenu != null}
        anchorRect={tableMenu?.anchorRect ?? null}
        onClose={() => setTableMenu(null)}
        onEditSize={handleTableEditSize}
        onDelete={handleTableDelete}
      />

      <TableSizeDialog
        open={tableDialog.open}
        mode={tableDialog.mode}
        initialRows={tableDialog.rows}
        initialCols={tableDialog.cols}
        onOpenChange={(open) =>
          setTableDialog((prev) => ({ ...prev, open }))
        }
        onConfirm={handleTableSizeConfirm}
      />

      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="relative" style={{ minHeight: areaHeight }}>
          <EditorContent
            editor={editor}
            className={cn(
              "[&_.ProseMirror]:min-h-full",
              isDrawing &&
                "[&_.ProseMirror]:pointer-events-none [&_.ProseMirror]:select-none"
            )}
          />
          <MemoDrawingOverlay
            strokes={strokes}
            onChange={onDrawingChange}
            active={isDrawing}
            mode={drawMode ?? "pen"}
            color={drawColor}
            height={areaHeight}
            onExtendHeight={handleExtendHeight}
          />
        </div>
      </div>
    </div>
  );
}
