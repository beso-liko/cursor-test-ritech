"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";

interface TableOptionsMenuProps {
  open: boolean;
  anchorRect: DOMRect | null;
  onClose: () => void;
  onEditSize: () => void;
  onDelete: () => void;
}

export default function TableOptionsMenu({
  open,
  anchorRect,
  onClose,
  onEditSize,
  onDelete,
}: TableOptionsMenuProps) {
  const { t } = useLanguage();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      onClose();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !anchorRect || typeof document === "undefined") return null;

  const menuWidth = 176;
  const left = Math.min(
    Math.max(8, anchorRect.left),
    window.innerWidth - menuWidth - 8
  );
  const top = anchorRect.bottom + 6;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className={cn(
        "fixed z-[70] w-44 overflow-hidden rounded-xl border border-border bg-popover shadow-lg",
        "animate-in fade-in-0 zoom-in-95 duration-100"
      )}
      style={{ top, left }}
    >
      <button
        type="button"
        role="menuitem"
        onClick={onEditSize}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
      >
        <Pencil className="h-4 w-4 shrink-0 text-primary" />
        <span>{t("notes.table.editSize")}</span>
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={onDelete}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4 shrink-0" />
        <span>{t("notes.table.delete")}</span>
      </button>
    </div>,
    document.body
  );
}
