"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, Target } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";

export type GenerationFocusMode = "general" | "focused";

export interface GenerationFocusChoice {
  mode: GenerationFocusMode;
  focus?: string;
}

interface GenerationFocusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: GenerationFocusMode;
  initialFocus?: string;
  documentId?: string;
  groupId?: string;
  /** When true, the dialog cannot be dismissed until a valid choice is made. */
  required?: boolean;
  /** Server-side validation failure key, e.g. "off_topic". */
  validationError?: string | null;
  onConfirm: (choice: GenerationFocusChoice) => void;
}

export default function GenerationFocusDialog({
  open,
  onOpenChange,
  initialMode = "general",
  initialFocus = "",
  documentId,
  groupId,
  required = false,
  validationError = null,
  onConfirm,
}: GenerationFocusDialogProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<GenerationFocusMode>(initialMode);
  const [focusText, setFocusText] = useState(initialFocus);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGroup = Boolean(groupId);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setFocusText(initialFocus);
      setValidating(false);
      setError(
        validationError === "off_topic" ? t("generateFocus.offTopic") : null
      );
    }
  }, [open, initialMode, initialFocus, validationError, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "general") {
      onConfirm({ mode: "general" });
      onOpenChange(false);
      return;
    }

    const trimmed = focusText.trim();
    if (!trimmed) return;

    setValidating(true);
    try {
      const res = await fetch("/api/generate/validate-focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(groupId ? { groupId } : { documentId }),
          focus: trimmed,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (res.status === 422 && data.error === "off_topic") {
        setError(t("generateFocus.offTopic"));
        return;
      }

      if (!res.ok) {
        setError(t("generateFocus.offTopic"));
        return;
      }

      onConfirm({ mode: "focused", focus: trimmed });
      onOpenChange(false);
    } finally {
      setValidating(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && required) return;
    onOpenChange(nextOpen);
  };

  const submitDisabled =
    validating || (mode === "focused" && !focusText.trim());

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!required}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("generateFocus.title")}</DialogTitle>
            <DialogDescription className="sr-only">
              {t("generateFocus.title")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <button
              type="button"
              onClick={() => {
                setMode("general");
                setError(null);
              }}
              className={cn(
                "w-full rounded-xl border p-4 text-left transition-colors",
                mode === "general"
                  ? "border-primary bg-primary/5"
                  : "border-border/60 hover:border-border"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    mode === "general"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {isGroup
                      ? t("generateFocus.option.generalGroup")
                      : t("generateFocus.option.general")}
                  </p>
                </div>
              </div>
            </button>

            <div
              className={cn(
                "rounded-xl border p-4 transition-colors",
                mode === "focused"
                  ? "border-primary bg-primary/5"
                  : "border-border/60"
              )}
            >
              <button
                type="button"
                onClick={() => {
                  setMode("focused");
                  setError(null);
                }}
                className="flex w-full items-start gap-3 text-left"
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    mode === "focused"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Target className="h-4 w-4" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {t("generateFocus.option.focused")}
                </p>
              </button>

              {mode === "focused" && (
                <div className="mt-3 pl-11">
                  <Label htmlFor="generation-focus" className="sr-only">
                    {t("generateFocus.option.focused")}
                  </Label>
                  <Textarea
                    id="generation-focus"
                    value={focusText}
                    onChange={(e) => {
                      setFocusText(e.target.value);
                      setError(null);
                    }}
                    placeholder={t("generateFocus.focus.placeholder")}
                    rows={3}
                    className="min-h-20 resize-none"
                    aria-invalid={Boolean(error)}
                  />
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="submit" disabled={submitDisabled} className="gap-2 w-full sm:w-auto">
              {validating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t("generateFocus.validating")}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>{t("generateFocus.submit")}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
