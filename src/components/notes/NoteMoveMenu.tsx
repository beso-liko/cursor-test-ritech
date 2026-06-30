"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FolderInput, FolderMinus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NoteFolder } from "@/lib/supabase/types";

interface NoteMoveMenuProps {
  folders: NoteFolder[];
  currentFolderId: string | null;
  onMove: (folderId: string | null) => void;
  moveToLabel: string;
  removeLabel: string;
  triggerLabel: string;
}

export default function NoteMoveMenu({
  folders,
  currentFolderId,
  onMove,
  moveToLabel,
  removeLabel,
  triggerLabel,
}: NoteMoveMenuProps) {
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const hasActions = folders.length > 0 || !!currentFolderId;

  const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (open) {
      setOpen(false);
      return;
    }
    setAnchorRect(event.currentTarget.getBoundingClientRect());
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-note-move-trigger]")) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const menuWidth = 192;
  const left = anchorRect
    ? Math.min(Math.max(8, anchorRect.right - menuWidth), window.innerWidth - menuWidth - 8)
    : 0;
  const top = anchorRect ? anchorRect.bottom + 6 : 0;

  if (!hasActions) return null;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        data-note-move-trigger
        onClick={handleToggle}
        aria-label={triggerLabel}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </Button>

      {open &&
        anchorRect &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className={cn(
              "fixed z-[100] overflow-hidden rounded-xl border border-border bg-popover shadow-lg",
              "animate-in fade-in-0 zoom-in-95 duration-100"
            )}
            style={{ top, left, width: menuWidth }}
          >
            {folders.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                  {moveToLabel}
                </div>
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    role="menuitem"
                    disabled={currentFolderId === folder.id}
                    onClick={() => {
                      onMove(folder.id);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent disabled:cursor-default disabled:opacity-40"
                  >
                    <FolderInput className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span className="truncate">{folder.name}</span>
                  </button>
                ))}
              </>
            )}
            {currentFolderId && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onMove(null);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
              >
                <FolderMinus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {removeLabel}
              </button>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
