"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/LanguageProvider";
import {
  clampTableCols,
  clampTableRows,
} from "@/lib/notes/table-utils";

export type TableSizeDialogMode = "create" | "edit";

interface TableSizeDialogProps {
  open: boolean;
  mode: TableSizeDialogMode;
  initialRows: number;
  initialCols: number;
  onOpenChange: (open: boolean) => void;
  onConfirm: (rows: number, cols: number) => void;
}

export default function TableSizeDialog({
  open,
  mode,
  initialRows,
  initialCols,
  onOpenChange,
  onConfirm,
}: TableSizeDialogProps) {
  const { t } = useLanguage();
  const [rows, setRows] = useState(String(initialRows));
  const [cols, setCols] = useState(String(initialCols));

  useEffect(() => {
    if (!open) return;
    setRows(String(initialRows));
    setCols(String(initialCols));
  }, [open, initialRows, initialCols]);

  const handleConfirm = () => {
    onConfirm(clampTableRows(Number(rows)), clampTableCols(Number(cols)));
    onOpenChange(false);
  };

  const title =
    mode === "create"
      ? t("notes.table.createTitle")
      : t("notes.table.editTitle");

  const description =
    mode === "create"
      ? t("notes.table.createDesc")
      : t("notes.table.editDesc");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="z-[70] sm:max-w-xs"
        overlayClassName="z-[70] bg-black/50"
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="table-rows">{t("notes.table.rows")}</Label>
            <Input
              id="table-rows"
              type="number"
              min={1}
              max={20}
              value={rows}
              onChange={(e) => setRows(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="table-cols">{t("notes.table.columns")}</Label>
            <Input
              id="table-cols"
              type="number"
              min={1}
              max={12}
              value={cols}
              onChange={(e) => setCols(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("notes.manager.cancel")}
          </Button>
          <Button type="button" onClick={handleConfirm}>
            {mode === "create"
              ? t("notes.table.insert")
              : t("notes.table.apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
