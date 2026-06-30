import { TableView } from "@tiptap/extension-table";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import { getTableDimensions } from "@/lib/notes/table-utils";
import { requestNoteTableMenu } from "@/lib/notes/note-table-edit";

type GetPos = () => number | undefined;

export class NoteTableView extends TableView {
  private getPos: GetPos = () => undefined;
  private handle: HTMLButtonElement;

  constructor(
    node: PMNode,
    cellMinWidth: number,
    view?: EditorView,
    HTMLAttributes?: Record<string, unknown>
  ) {
    super(node, cellMinWidth, view, HTMLAttributes);

    this.dom.classList.add("note-table-wrapper");

    this.handle = document.createElement("button");
    this.handle.type = "button";
    this.handle.className = "note-table-handle not-prose";
    this.handle.setAttribute("aria-label", "Table options");
    this.handle.setAttribute("aria-haspopup", "menu");
    this.handle.setAttribute("contenteditable", "false");
    this.handle.tabIndex = 0;

    for (let i = 0; i < 3; i++) {
      this.handle.appendChild(document.createElement("span"));
    }

    this.handle.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    this.handle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const tablePos = this.getPos();
      if (tablePos == null || tablePos < 0) return;

      const { rows, cols } = getTableDimensions(this.node);
      requestNoteTableMenu({
        tablePos,
        rows,
        cols,
        anchorRect: this.handle.getBoundingClientRect(),
      });
    });

    this.dom.appendChild(this.handle);
  }

  bindGetPos(getPos: GetPos) {
    this.getPos = getPos;
  }

  update(node: PMNode) {
    if (node.type !== this.node.type) {
      return false;
    }

    const updated = super.update(node);
    if (updated && !this.dom.contains(this.handle)) {
      this.dom.appendChild(this.handle);
    }
    return updated;
  }
}
