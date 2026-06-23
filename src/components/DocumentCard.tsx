"use client";

import Link from "next/link";
import { FileText, FileImage, Presentation, File, Image, Trash2, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Document } from "@/lib/supabase/types";
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
}

export default function DocumentCard({ document: doc, onDelete }: DocumentCardProps) {
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
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(doc.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
