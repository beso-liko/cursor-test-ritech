"use client";

import { useState } from "react";
import Link from "next/link";
import { Folder, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CreateFolderDialog from "@/components/CreateFolderDialog";
import type { DocumentGroup } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";

interface FolderCardProps {
  folder: DocumentGroup;
  docCount: number;
  onRename: (id: string, newName: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function FolderCard({
  folder,
  docCount,
  onRename,
  onDelete,
}: FolderCardProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { t, locale } = useLanguage();

  const dateLocale = locale === "sq" ? "sq-AL" : "en-US";
  const formattedDate = new Date(folder.created_at).toLocaleDateString(dateLocale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const docLabel =
    docCount === 1 ? t("folder.docs.one") : t("folder.docs.other", { n: docCount });

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(folder.id);
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <>
      <Card className="group shadow-none border-border/60 hover:border-primary/40 hover:shadow-md transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Folder icon — entire left area is a link */}
            <Link
              href={`/documents/group/${folder.id}`}
              className="shrink-0 p-2.5 rounded-xl bg-amber-50 text-amber-500 hover:bg-amber-100 transition-colors"
            >
              <Folder className="w-5 h-5" />
            </Link>

            <div className="flex-1 min-w-0">
              <Link href={`/documents/group/${folder.id}`}>
                <h3 className="font-medium text-sm text-foreground truncate hover:text-primary transition-colors cursor-pointer">
                  {folder.name}
                </h3>
              </Link>
              <p className="text-xs text-muted-foreground mt-0.5">
                {docLabel}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formattedDate}
              </p>
            </div>

            {/* Kebab menu */}
            <Menu.Root>
              <Menu.Trigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 text-muted-foreground"
                    onClick={(e) => e.preventDefault()}
                  />
                }
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner sideOffset={4} align="end">
                  <Menu.Popup
                    className={cn(
                      "z-50 min-w-[140px] origin-[var(--transform-origin)] rounded-xl border border-border bg-popover p-1 shadow-md outline-none",
                      "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
                      "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
                    )}
                  >
                    <Menu.Item
                      className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-foreground cursor-pointer select-none outline-none data-highlighted:bg-accent"
                      onClick={() => setRenameOpen(true)}
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                      {t("folder.rename")}
                    </Menu.Item>
                    <Menu.Item
                      className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-destructive cursor-pointer select-none outline-none data-highlighted:bg-destructive/10"
                      onClick={() => setDeleteConfirmOpen(true)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t("folder.delete.action")}
                    </Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </div>
        </CardContent>
      </Card>

      {/* Rename dialog */}
      <CreateFolderDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        initialName={folder.name}
        title={t("folder.dialog.rename.title")}
        submitLabel={t("folder.dialog.rename.submit")}
        onSubmit={(newName) => onRename(folder.id, newName)}
      />

      {/* Delete confirmation dialog */}
      {deleteConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-xs"
          onClick={() => setDeleteConfirmOpen(false)}
        >
          <div
            className="bg-popover border border-border rounded-xl shadow-md p-5 w-full max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-base text-foreground">
              {t("folder.delete.title", { name: folder.name })}
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              {t("folder.delete.desc")}
            </p>
            <div className="flex gap-2 justify-end mt-5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
              >
                {t("folder.delete.cancel")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? t("folder.deleting") : t("folder.delete.confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
