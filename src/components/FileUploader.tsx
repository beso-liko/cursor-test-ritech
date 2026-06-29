"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  FileText,
  Image,
  X,
  CheckCircle,
  Loader2,
  AlertCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/LanguageProvider";

const ACCEPTED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/heic": "heic",
  "image/heif": "heif",
};

const EXTENSION_MAP: Record<string, string> = {
  heic: "heic",
  heif: "heif",
};

const IMAGE_TYPES = new Set(["png", "jpg", "jpeg", "heic", "heif"]);

const MAX_SIZE_MB = 20;

type FileStatus = "idle" | "uploading" | "processing" | "done" | "error";

interface FileEntry {
  id: string;
  file: File;
  fileType: string;
  status: FileStatus;
  progress: number;
  error: string | null;
  documentId: string | null;
}

function resolveFileType(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return ACCEPTED_TYPES[file.type] ?? EXTENSION_MAP[ext] ?? null;
}

export default function FileUploader() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [globalStatus, setGlobalStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [globalError, setGlobalError] = useState<string | null>(null);

  const updateEntry = useCallback(
    (id: string, patch: Partial<FileEntry>) =>
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e))
      ),
    []
  );

  const addFiles = useCallback(
    (files: File[]) => {
      const newEntries: FileEntry[] = [];
      let typeError = false;
      let sizeError = false;

      for (const file of files) {
        const fileType = resolveFileType(file);
        if (!fileType) { typeError = true; continue; }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) { sizeError = true; continue; }
        newEntries.push({
          id: `${Date.now()}_${Math.random()}`,
          file,
          fileType,
          status: "idle",
          progress: 0,
          error: null,
          documentId: null,
        });
      }

      setEntries((prev) => [...prev, ...newEntries]);

      if (typeError) setGlobalError(t("uploader.error.type"));
      else if (sizeError) setGlobalError(t("uploader.error.size", { max: MAX_SIZE_MB }));
      else setGlobalError(null);
    },
    [t]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const removeEntry = (id: string) =>
    setEntries((prev) => prev.filter((e) => e.id !== id));

  const reset = () => {
    setEntries([]);
    setGlobalStatus("idle");
    setGlobalError(null);
  };

  const handleUpload = async () => {
    if (entries.length === 0) return;

    setGlobalStatus("running");
    setGlobalError(null);

    const meRes = await fetch("/api/me");
    if (!meRes.ok) {
      setGlobalError("You must be signed in to upload files.");
      setGlobalStatus("error");
      return;
    }

    // Create a group if uploading more than one file
    let groupId: string | null = null;
    if (entries.length > 1) {
      const groupName = entries.map((e) => e.file.name).join(", ");
      const groupRes = await fetch("/api/document-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName }),
      });

      if (!groupRes.ok) {
        setGlobalError("Failed to create document group");
        setGlobalStatus("error");
        return;
      }
      const groupData = await groupRes.json();
      groupId = groupData.id;
    }

    // Upload + process each file (in parallel)
    const results = await Promise.allSettled(
      entries.map((entry) => uploadOne(entry, groupId, updateEntry))
    );

    const allDocumentIds = results
      .filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled")
      .map((r) => r.value);

    const anyError = results.some((r) => r.status === "rejected");

    if (anyError && allDocumentIds.length === 0) {
      setGlobalStatus("error");
      return;
    }

    setGlobalStatus("done");

    setTimeout(() => {
      if (groupId) {
        router.push(`/documents/group/${groupId}`);
      } else if (allDocumentIds.length === 1) {
        router.push(`/documents/${allDocumentIds[0]}`);
      }
    }, 1500);
  };

  const isRunning = globalStatus === "running";
  const isDone = globalStatus === "done";
  const idleEntries = entries.filter((e) => e.status === "idle");
  const allIdle = entries.length > 0 && entries.every((e) => e.status === "idle");

  return (
    <div className="space-y-4 max-w-xl">
      {/* Drop zone — always visible so more files can be added */}
      {!isRunning && !isDone && (
        <label
          htmlFor="file-input"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center justify-center w-full border-2 border-dashed rounded-2xl cursor-pointer transition-colors",
            entries.length > 0 ? "h-24" : "h-48",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-accent/30"
          )}
        >
          {entries.length > 0 ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">{t("uploader.addMore")}</span>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-foreground">
                {t("uploader.drop")}{" "}
                <span className="text-primary">{t("uploader.browse")}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1 text-center px-6">
                {t("uploader.formats", { max: MAX_SIZE_MB })}
              </p>
            </>
          )}
          <input
            id="file-input"
            type="file"
            multiple
            accept=".pdf,.docx,.pptx,.txt,.png,.jpg,.jpeg,.heic,.heif"
            className="hidden"
            onChange={onInputChange}
          />
        </label>
      )}

      {/* File list */}
      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry) => (
            <FileRow
              key={entry.id}
              entry={entry}
              onRemove={entry.status === "idle" ? () => removeEntry(entry.id) : undefined}
            />
          ))}
        </div>
      )}

      {/* Global error */}
      {globalError && (
        <p className="text-xs text-destructive flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" /> {globalError}
        </p>
      )}

      {/* Action buttons */}
      {allIdle && (
        <Button className="w-full" onClick={handleUpload}>
          <Upload className="w-4 h-4 mr-2" />
          {entries.length === 1
            ? t("uploader.button.upload")
            : t("uploader.button.uploadAll", { n: entries.length })}
        </Button>
      )}

      {(globalStatus === "error" || (isDone && entries.some((e) => e.status === "error"))) && (
        <Button variant="outline" className="w-full" onClick={reset}>
          {t("uploader.button.retry")}
        </Button>
      )}
    </div>
  );
}

// ─── Per-file row ────────────────────────────────────────────────────────────

function FileRow({
  entry,
  onRemove,
}: {
  entry: FileEntry;
  onRemove?: () => void;
}) {
  const { t } = useLanguage();
  const isImage = IMAGE_TYPES.has(entry.fileType);

  return (
    <div className="border rounded-xl p-3 bg-card space-y-2">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          {isImage ? (
            <Image className="w-4 h-4 text-primary" />
          ) : (
            <FileText className="w-4 h-4 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{entry.file.name}</p>
          <p className="text-xs text-muted-foreground">
            {(entry.file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>

        {entry.status === "idle" && onRemove && (
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onRemove}>
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
        {entry.status === "done" && (
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
        )}
        {entry.status === "error" && (
          <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
        )}
      </div>

      {(entry.status === "uploading" || entry.status === "processing") && (
        <div className="space-y-1">
          <Progress value={entry.progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            {entry.status === "uploading"
              ? t("uploader.status.uploading")
              : t("uploader.status.processing")}
          </p>
        </div>
      )}

      {entry.status === "done" && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{t("uploader.status.done")}</p>
      )}

      {entry.status === "error" && (
        <p className="text-xs text-destructive">{entry.error}</p>
      )}
    </div>
  );
}

// ─── Upload logic for a single file ─────────────────────────────────────────

async function uploadOne(
  entry: FileEntry,
  groupId: string | null,
  update: (id: string, patch: Partial<FileEntry>) => void
): Promise<string> {
  update(entry.id, { status: "uploading", progress: 10, error: null });

  try {
    const createRes = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: entry.file.name,
        fileType: entry.fileType,
        groupId,
      }),
    });

    if (!createRes.ok) throw new Error("Failed to create document record");

    const { documentId, storagePath, signedUploadUrl, fileUrl } = await createRes.json();
    update(entry.id, { progress: 25, documentId });

    const uploadRes = await fetch(signedUploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": entry.file.type || "application/octet-stream",
      },
      body: entry.file,
    });

    if (!uploadRes.ok) throw new Error("Upload failed");

    update(entry.id, { progress: 50, status: "processing" });

    await fetch(`/api/documents/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileUrl }),
    });

    update(entry.id, { progress: 60 });

    const res = await fetch("/api/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filePath: storagePath,
        fileName: entry.file.name,
        fileType: entry.fileType,
        documentId,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? "Processing failed");
    }

    update(entry.id, { progress: 100, status: "done" });
    return documentId;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    update(entry.id, { status: "error", error: message, progress: 0 });
    throw err;
  }
}
