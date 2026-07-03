"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

export interface SelectionState {
  text: string;
  top: number;
  left: number;
}

function isSelectionWithin(
  container: HTMLElement,
  selection: Selection
): boolean {
  const { anchorNode, focusNode } = selection;
  if (!anchorNode || !focusNode) return false;
  return container.contains(anchorNode) && container.contains(focusNode);
}

export function useTextSelectionAction(
  enabled: boolean,
  containerRef: RefObject<HTMLElement | null>
) {
  const [selection, setSelection] = useState<SelectionState | null>(null);

  const clearSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const updateSelection = useCallback(() => {
    if (!enabled) {
      setSelection(null);
      return;
    }

    const container = containerRef.current;
    if (!container) {
      setSelection(null);
      return;
    }

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setSelection(null);
      return;
    }

    if (!isSelectionWithin(container, sel)) {
      setSelection(null);
      return;
    }

    const text = sel.toString().trim();
    if (!text) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setSelection(null);
      return;
    }

    setSelection({
      text,
      top: rect.bottom + 6,
      left: rect.left + rect.width / 2,
    });
  }, [enabled, containerRef]);

  useEffect(() => {
    if (!enabled) {
      setSelection(null);
      return;
    }

    const handleSelectionEnd = () => {
      requestAnimationFrame(updateSelection);
    };

    document.addEventListener("mouseup", handleSelectionEnd);
    document.addEventListener("touchend", handleSelectionEnd);
    document.addEventListener("selectionchange", handleSelectionEnd);
    document.addEventListener("scroll", () => setSelection(null), true);

    return () => {
      document.removeEventListener("mouseup", handleSelectionEnd);
      document.removeEventListener("touchend", handleSelectionEnd);
      document.removeEventListener("selectionchange", handleSelectionEnd);
    };
  }, [enabled, updateSelection]);

  return { selection, clearSelection };
}
