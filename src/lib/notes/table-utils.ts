import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";

const MIN_ROWS = 1;
const MAX_ROWS = 20;
const MIN_COLS = 1;
const MAX_COLS = 12;

export function clampTableRows(rows: number) {
  return Math.min(MAX_ROWS, Math.max(MIN_ROWS, Math.round(rows)));
}

export function clampTableCols(cols: number) {
  return Math.min(MAX_COLS, Math.max(MIN_COLS, Math.round(cols)));
}

export function getTableDimensions(table: {
  childCount: number;
  firstChild: { childCount: number } | null;
}) {
  return {
    rows: table.childCount,
    cols: table.firstChild?.childCount ?? 0,
  };
}

function buildResizedTable(
  table: PMNode,
  schema: Editor["schema"],
  rows: number,
  cols: number
) {
  const usesHeaderRow =
    table.childCount > 0 &&
    table.child(0).childCount > 0 &&
    table.child(0).child(0).type.name === "tableHeader";

  const rowNodes = [];

  for (let r = 0; r < rows; r++) {
    const srcRow = r < table.childCount ? table.child(r) : null;
    const cells = [];

    for (let c = 0; c < cols; c++) {
      const useHeader = usesHeaderRow && r === 0;
      const cellType = useHeader
        ? schema.nodes.tableHeader!
        : schema.nodes.tableCell!;
      const srcCell =
        srcRow && c < srcRow.childCount ? srcRow.child(c) : null;

      if (srcCell) {
        cells.push(cellType.create(srcCell.attrs, srcCell.content));
      } else {
        cells.push(cellType.create(null, schema.nodes.paragraph.create()));
      }
    }

    rowNodes.push(schema.nodes.tableRow.create(null, cells));
  }

  return schema.nodes.table.create(table.attrs, rowNodes);
}

export function resolveTablePos(
  editor: Editor,
  tablePos?: number
): number | null {
  if (tablePos != null) {
    const node = editor.state.doc.nodeAt(tablePos);
    if (node?.type.name === "table") {
      return tablePos;
    }
  }

  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === "table") {
      return $from.before(depth);
    }
  }

  return null;
}

export function resizeTable(
  editor: Editor,
  tablePos: number,
  targetRows: number,
  targetCols: number
): boolean {
  const rows = clampTableRows(targetRows);
  const cols = clampTableCols(targetCols);

  const pos = resolveTablePos(editor, tablePos);
  if (pos == null) {
    return false;
  }

  const { state } = editor;
  const table = state.doc.nodeAt(pos);
  if (!table || table.type.name !== "table") {
    return false;
  }

  const current = getTableDimensions(table);
  if (current.rows === rows && current.cols === cols) {
    return true;
  }

  const newTable = buildResizedTable(table, state.schema, rows, cols);
  const tr = state.tr.replaceWith(pos, pos + table.nodeSize, newTable);
  editor.view.dispatch(tr);
  return true;
}

export function deleteTable(editor: Editor, tablePos: number): boolean {
  const pos = resolveTablePos(editor, tablePos);
  if (pos == null) {
    return false;
  }

  const { state } = editor;
  const table = state.doc.nodeAt(pos);
  if (!table || table.type.name !== "table") {
    return false;
  }

  let tr = state.tr.delete(pos, pos + table.nodeSize);

  if (tr.doc.childCount === 0) {
    tr = tr.insert(0, state.schema.nodes.paragraph.create());
  }

  editor.view.dispatch(tr);
  return true;
}
