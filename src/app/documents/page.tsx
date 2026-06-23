"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Upload, FileText, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AppShell from "@/components/AppShell";
import DocumentCard from "@/components/DocumentCard";
import type { Document } from "@/lib/supabase/types";
import { useLanguage } from "@/components/LanguageProvider";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { t } = useLanguage();

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data: Document[] = await res.json();
        setDocuments(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm(t("documents.delete.confirm"))) return;
    setDocuments((docs) => docs.filter((d) => d.id !== id));
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
  };

  const filtered = documents.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const docCountLabel =
    documents.length === 1
      ? t("documents.count.one")
      : t("documents.count.other", { n: documents.length });

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t("documents.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {docCountLabel}
            </p>
          </div>
          <Button nativeButton={false} render={<Link href="/upload" />} className="gap-2">
            <Upload className="w-4 h-4" />
            {t("documents.upload")}
          </Button>
        </div>

        {/* Search */}
        {documents.length > 0 && (
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("documents.search")}
              className="pl-9"
            />
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-2xl p-12 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">
              {t("documents.empty.title")}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              {t("documents.empty.desc")}
            </p>
            <Button nativeButton={false} render={<Link href="/upload" />} className="mt-4 gap-2">
              <Upload className="w-4 h-4" />
              {t("documents.empty.cta")}
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 text-sm">
            {t("documents.noMatch", { search })}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
