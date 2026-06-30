import { mergeAttributes } from "@tiptap/core";
import { Table } from "@tiptap/extension-table";
import type { NodeView } from "@tiptap/pm/view";
import { NoteTableView } from "@/components/notes/NoteTableView";

/**
 * Table extension that passes `getPos` into NoteTableView so edit/resize
 * can target the correct document position (DOM posAtDOM on <table> is unreliable).
 */
export const NoteTable = Table.extend({
  addNodeView() {
    const isResizable = this.options.resizable && this.editor.isEditable;
    const View = this.options.View;

    if (isResizable || !View) {
      return null;
    }

    return ({ node, view, HTMLAttributes, getPos }) => {
      const mergedAttributes = mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes
      );

      const nodeView = new View(
        node,
        this.options.cellMinWidth,
        view,
        mergedAttributes
      ) as NoteTableView;

      nodeView.bindGetPos(getPos);
      return nodeView as NodeView;
    };
  },
});
