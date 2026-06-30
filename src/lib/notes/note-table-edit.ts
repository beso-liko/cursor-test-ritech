export interface TableMenuRequest {
  tablePos: number;
  rows: number;
  cols: number;
  anchorRect: DOMRect;
}

let handler: ((request: TableMenuRequest) => void) | null = null;

export function setNoteTableMenuHandler(
  fn: ((request: TableMenuRequest) => void) | null
) {
  handler = fn;
}

export function requestNoteTableMenu(request: TableMenuRequest) {
  handler?.(request);
}
