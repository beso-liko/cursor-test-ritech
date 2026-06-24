"use client";

import Link from "next/link";
import {
  FileText, FileImage, Presentation, File, Image, Trash2,
  CheckCircle, Clock, AlertCircle, MoreHorizontal, FolderInput, FolderMinus,
} from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Document, DocumentGroup } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";

const fileIcons = {
  pdf: { icon: FileText, color: "text-red-500 bg-red-50" },
  docx: { icon: File, color: "text-blue-500 bg-blue-50" },
  pptx: { icon: Presentation, color: "text-orange-500 bg-orange-50" },
  txt: { icon: FileImage, color: "text-gray-500 bg-gray-50" },
  png: { icon: Image, color: "text-violet-500 bg-violet-50" },
  jpg: { icon: Image, color: "text-violet-500 bg-violet-50" },
  jpeg: { icon: Image, color: "text-violet-500 bg-violet-50" },
};

interface DocumentCardProps {
  document: Document;
  onDelete?: (id: string) => void;
  /** Available folders for the "Move to folder" action */
  folders?: DocumentGroup[];
  /** Called after a successful move or unfile */
  onMove?: (docId: string, groupId: string | null) => void;
}

export default function DocumentCard({
  document: doc,
  onDelete,
  folders,
  onMove,
}: DocumentCardProps) {
  const { t, locale } = useLanguage();

  const statusConfig = {
    ready: { label: t("card.status.ready"), icon: CheckCircle, class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    processing: { label: t("card.status.processing"), icon: Clock, class: "bg-amber-50 text-amber-700 border-amber-200" },
    error: { label: t("card.status.error"), icon: AlertCircle, class: "bg-red-50 text-red-700 border-red-200" },
  };

  const fileConfig = fileIcons[doc.file_type as keyof typeof fileIcons] ?? fileIcons.txt;
  const status = statusConfig[doc.status as keyof typeof statusConfig] ?? statusConfig.error;
  const Icon = fileConfig.icon;
  const StatusIcon = status.icon;

  const dateLocale = locale === "sq" ? "sq-AL" : "en-US";
  const formattedDate = new Date(doc.created_at).toLocaleDateString(dateLocale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const hasFolderActions = (folders && folders.length > 0) || doc.group_id;
  const showMenu = hasFolderActions || onDelete;

  const handleMove = async (groupId: string | null) => {
    if (!onMove) return;
    await fetch(`/api/documents/${doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId }),
    });
    onMove(doc.id, groupId);
  };

  return (
    <Card className="group shadow-none border-border/60 hover:border-primary/40 hover:shadow-md transition-all duration-200">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2.5 rounded-xl shrink-0", fileConfig.color)}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <Link href={`/documents/${doc.id}`}>
              <h3 className="font-medium text-sm text-foreground truncate hover:text-primary transition-colors cursor-pointer">
                {doc.name}
              </h3>
            </Link>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge
                variant="outline"
                className={cn("text-xs px-1.5 py-0.5 border", status.class)}
              >
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
              <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                {doc.file_type.toUpperCase()}
              </Badge>
              {doc.chunk_count > 0 && (
                <span className="text-xs text-muted-foreground">
                  {t("card.chunks", { n: doc.chunk_count })}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">{formattedDate}</p>
          </div>

          {/* Action area — shown on hover */}
          <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {showMenu && (
              <Menu.Root>
                <Menu.Trigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                    />
                  }
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Positioner sideOffset={4} alignment="end">
                    <Menu.Popup
                      className={cn(
                        "z-50 min-w-[180px] origin-[var(--transform-origin)] rounded-xl border border-border bg-popover p-1 shadow-md outline-none",
                        "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95",
                        "data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
                      )}
                    >
                      {/* Move-to-folder items */}
                      {folders && folders.length > 0 && (
                        <>
                          <div className="px-3 py-1 text-xs font-medium text-muted-foreground">
                            Move to folder
                          </div>
                          {folders.map((folder) => (
                            <Menu.Item
                              key={folder.id}
                              disabled={doc.group_id === folder.id}
                              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-foreground cursor-pointer select-none outline-none data-highlighted:bg-accent data-disabled:opacity-40 data-disabled:cursor-default"
                              onClick={() => handleMove(folder.id)}
                            >
                              <FolderInput className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="truncate">{folder.name}</span>
                            </Menu.Item>
                          ))}
                        </>
                      )}

                      {/* Remove from folder */}
                      {doc.group_id && (
                        <Menu.Item
                          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-foreground cursor-pointer select-none outline-none data-highlighted:bg-accent"
                          onClick={() => handleMove(null)}
                        >
                          <FolderMinus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          Remove from folder
                        </Menu.Item>
                      )}

                      {/* Delete */}
                      {onDelete && (
                        <>
                          {(hasFolderActions) && (
                            <div className="my-1 h-px bg-border mx-1" />
                          )}
                          <Menu.Item
                            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-destructive cursor-pointer select-none outline-none data-highlighted:bg-destructive/10"
                            onClick={() => onDelete(doc.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                            Delete
                          </Menu.Item>
                        </>
                      )}
                    </Menu.Popup>
                  </Menu.Positioner>
                </Menu.Portal>
              </Menu.Root>
            )}

            {/* Fallback: plain delete button when no menu needed */}
            {!showMenu && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(doc.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
