"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Image, X, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { createBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
  "image/png": "png",
  "image/jpeg": "jpeg",
};

const IMAGE_TYPES = new Set(["png", "jpg", "jpeg"]);

const MAX_SIZE_MB = 20;

type UploadStatus = "idle" | "uploading" | "processing" | "done" | "error";

interface UploadState {
  file: File | null;
  status: UploadStatus;
  progress: number;
  error: string | null;
  documentId: string | null;
}

export default function FileUploader() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [state, setState] = useState<UploadState>({
    file: null,
    status: "idle",
    progress: 0,
    error: null,
    documentId: null,
  });

  const handleFile = useCallback((file: File) => {
    const fileType = ACCEPTED_TYPES[file.type];
    if (!fileType) {
      setState((s) => ({
        ...s,
        error: "Unsupported file type. Please upload PDF, DOCX, PPTX, TXT, PNG, or JPEG.",
      }));
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setState((s) => ({
        ...s,
        error: `File too large. Maximum size is ${MAX_SIZE_MB}MB.`,
      }));
      return;
    }
    setState({ file, status: "idle", progress: 0, error: null, documentId: null });
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleUpload = async () => {
    if (!state.file) return;

    const fileType = ACCEPTED_TYPES[state.file.type];
    const fileName = state.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${Date.now()}_${fileName}`;

    setState((s) => ({ ...s, status: "uploading", progress: 10, error: null }));

    const supabase = createBrowserClient();

    try {
      // 1. Create document record first
      const { data: docRes, error: docErr } = await supabase
        .from("documents")
        .insert({
          name: state.file.name,
          file_type: fileType,
          status: "processing",
        })
        .select()
        .single();

      if (docErr || !docRes) throw new Error("Failed to create document record");

      const documentId = docRes.id;
      setState((s) => ({ ...s, progress: 25, documentId }));

      // 2. Upload file to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from("documents")
        .upload(storagePath, state.file, { upsert: false });

      if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

      setState((s) => ({ ...s, progress: 55, status: "processing" }));

      // 3. Update document with file URL
      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(storagePath);

      await supabase
        .from("documents")
        .update({ file_url: urlData.publicUrl })
        .eq("id", documentId);

      setState((s) => ({ ...s, progress: 65 }));

      // 4. Trigger text extraction + embedding
      const res = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath: storagePath,
          fileName: state.file.name,
          fileType,
          documentId,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Processing failed");
      }

      setState((s) => ({ ...s, progress: 100, status: "done" }));

      setTimeout(() => router.push(`/documents/${documentId}`), 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setState((s) => ({ ...s, status: "error", error: message }));
    }
  };

  const reset = () => {
    setState({ file: null, status: "idle", progress: 0, error: null, documentId: null });
  };

  const { file, status, progress, error } = state;

  return (
    <div className="space-y-4 max-w-xl">
      {/* Drop zone */}
      {!file || status === "idle" ? (
        <label
          htmlFor="file-input"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-accent/30"
          )}
        >
          <Upload className="w-8 h-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground">
            Drop your file here, or <span className="text-primary">browse</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, DOCX, PPTX, TXT, PNG, JPEG — up to {MAX_SIZE_MB}MB
          </p>
          <input
            id="file-input"
            type="file"
            accept=".pdf,.docx,.pptx,.txt,.png,.jpg,.jpeg"
            className="hidden"
            onChange={onInputChange}
          />
        </label>
      ) : null}

      {/* Selected file card */}
      {file && (
        <div className="border rounded-xl p-4 bg-card space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              {IMAGE_TYPES.has(ACCEPTED_TYPES[file.type]) ? (
                <Image className="w-4 h-4 text-primary" />
              ) : (
                <FileText className="w-4 h-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {status === "idle" && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={reset}>
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
            {status === "done" && <CheckCircle className="w-5 h-5 text-emerald-500" />}
            {status === "error" && <AlertCircle className="w-5 h-5 text-destructive" />}
          </div>

          {/* Progress */}
          {(status === "uploading" || status === "processing") && (
            <div className="space-y-1.5">
              <Progress value={progress} className="h-1.5" />
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                {status === "uploading" ? "Uploading file…" : "Extracting and indexing…"}
              </p>
            </div>
          )}

          {status === "done" && (
            <p className="text-xs text-emerald-600 font-medium">
              Document ready! Redirecting…
            </p>
          )}

          {status === "error" && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>
      )}

      {/* Error outside card */}
      {!file && error && (
        <p className="text-xs text-destructive flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}

      {/* Upload button */}
      {file && status === "idle" && (
        <Button className="w-full" onClick={handleUpload}>
          <Upload className="w-4 h-4 mr-2" />
          Upload & Process
        </Button>
      )}

      {file && status === "error" && (
        <Button variant="outline" className="w-full" onClick={reset}>
          Try again
        </Button>
      )}
    </div>
  );
}
