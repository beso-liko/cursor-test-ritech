"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fill when renaming an existing folder */
  initialName?: string;
  title: string;
  submitLabel: string;
  onSubmit: (name: string) => Promise<void>;
}

export default function CreateFolderDialog({
  open,
  onOpenChange,
  initialName = "",
  title,
  submitLabel,
  onSubmit,
}: CreateFolderDialogProps) {
  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  // Sync when dialog is reopened with a different initialName
  useEffect(() => {
    if (open) {
      setName(initialName);
      setLoading(false);
      // Focus after animation frame so the input is visible
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await onSubmit(trimmed);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="folder-name" className="text-sm font-medium mb-1.5 block">
              {t("folder.dialog.name.label")}
            </Label>
            <Input
              id="folder-name"
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("folder.dialog.name.placeholder")}
              maxLength={200}
              autoComplete="off"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t("folder.dialog.cancel")}
            </Button>
            <Button type="submit" disabled={!name.trim() || loading}>
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
