"use client";

import { useEffect, useState } from "react";
import { Upload, FileText, Search, Loader2, FolderPlus, Folder } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AppShell from "@/components/AppShell";
import DocumentCard from "@/components/DocumentCard";
import FolderCard from "@/components/FolderCard";
import CreateFolderDialog from "@/components/CreateFolderDialog";
import type { Document, DocumentGroup } from "@/lib/supabase/types";
import { useLanguage } from "@/components/LanguageProvider";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<DocumentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const { t } = useLanguage();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [docsRes, foldersRes] = await Promise.all([
        fetch("/api/documents"),
        fetch("/api/document-groups"),
      ]);
      const [docs, fols] = await Promise.all([
        docsRes.ok ? docsRes.json() : [],
        foldersRes.ok ? foldersRes.json() : [],
      ]);
      setDocuments(docs as Document[]);
      setFolders(fols as DocumentGroup[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // --- Derived data ---
  const unfiledDocs = documents.filter((d) => !d.group_id);
  const docCountPerFolder = (folderId: string) =>
    documents.filter((d) => d.group_id === folderId).length;

  const searchLower = search.toLowerCase();
  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchLower)
  );
  const filteredUnfiled = unfiledDocs.filter((d) =>
    d.name.toLowerCase().includes(searchLower)
  );

  const totalCount = documents.length;
  const docCountLabel =
    totalCount === 1
      ? t("documents.count.one")
      : t("documents.count.other", { n: totalCount });

  const folderCountLabel =
    folders.length === 1
      ? t("folder.count.one")
      : t("folder.count.other", { n: folders.length });

  // --- Handlers ---
  const handleDelete = async (id: string) => {
    if (!confirm(t("documents.delete.confirm"))) return;
    setDocuments((docs) => docs.filter((d) => d.id !== id));
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
  };

  const handleMove = (docId: string, groupId: string | null) => {
    setDocuments((docs) =>
      docs.map((d) => (d.id === docId ? { ...d, group_id: groupId } : d))
    );
  };

  const handleCreateFolder = async (name: string) => {
    const res = await fetch("/api/document-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const newFolder: DocumentGroup = await res.json();
      setFolders((prev) => [newFolder, ...prev]);
    }
  };

  const handleRenameFolder = async (id: string, newName: string) => {
    const res = await fetch(`/api/document-groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      const updated: DocumentGroup = await res.json();
      setFolders((prev) => prev.map((f) => (f.id === id ? updated : f)));
    }
  };

  const handleDeleteFolder = async (id: string) => {
    await fetch(`/api/document-groups/${id}`, { method: "DELETE" });
    setFolders((prev) => prev.filter((f) => f.id !== id));
    // Documents that were in this folder become unfiled
    setDocuments((prev) =>
      prev.map((d) => (d.group_id === id ? { ...d, group_id: null } : d))
    );
  };

  const isEmpty = documents.length === 0 && folders.length === 0;
  const hasResults = filteredFolders.length > 0 || filteredUnfiled.length > 0;

  return (
    <AppShell>
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t("documents.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {folders.length > 0
                ? `${folderCountLabel} · ${docCountLabel}`
                : docCountLabel}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setCreateFolderOpen(true)}
            >
              <FolderPlus className="w-4 h-4" />
              <span className="hidden sm:inline">{t("folder.new")}</span>
            </Button>
            <Button nativeButton={false} render={<Link href="/upload" />} className="gap-2">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">{t("documents.upload")}</span>
            </Button>
          </div>
        </div>

        {/* Search */}
        {!isEmpty && (
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("folder.search")}
              className="pl-9"
            />
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : isEmpty ? (
          /* Empty state */
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
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setCreateFolderOpen(true)}
              >
                <FolderPlus className="w-4 h-4" />
                {t("folder.new")}
              </Button>
              <Button nativeButton={false} render={<Link href="/upload" />} className="gap-2">
                <Upload className="w-4 h-4" />
                {t("documents.empty.cta")}
              </Button>
            </div>

          </div>
        ) : !hasResults ? (
          <p className="text-center text-muted-foreground py-12 text-sm">
            {t("documents.noMatch", { search })}
          </p>
        ) : (
          <div className="space-y-8">
            {/* Folders section */}
            {filteredFolders.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Folder className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {t("folder.section.folders")}
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredFolders.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      docCount={docCountPerFolder(folder.id)}
                      onRename={handleRenameFolder}
                      onDelete={handleDeleteFolder}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Unfiled documents section */}
            {filteredUnfiled.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {folders.length > 0 ? t("folder.section.unfiled") : t("folder.section.all")}
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredUnfiled.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      folders={folders}
                      onDelete={handleDelete}
                      onMove={handleMove}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Create folder dialog */}
      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        title={t("folder.dialog.new.title")}
        submitLabel={t("folder.dialog.new.submit")}
        onSubmit={handleCreateFolder}
      />
    </AppShell>
  );
}
