"use client";

import { Sparkles, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import GenerationFocusDialog from "@/components/GenerationFocusDialog";
import { useLanguage } from "@/components/LanguageProvider";
import type { useGenerationFocus } from "@/hooks/useGenerationFocus";

type FocusControls = ReturnType<typeof useGenerationFocus>;

interface GenerationFocusControlsProps {
  documentId?: string;
  groupId?: string;
  controls: FocusControls;
}

export default function GenerationFocusControls({
  documentId,
  groupId,
  controls,
}: GenerationFocusControlsProps) {
  const { t } = useLanguage();
  const {
    isGroup,
    focusDialogOpen,
    setFocusDialogOpen,
    generationMode,
    generationFocus,
    activeMode,
    activeFocus,
    hasAnyContent,
    showChoosePrompt,
    handleFocusConfirm,
    openChangeFocusDialog,
    dialogRequired,
    focusValidationError,
  } = controls;

  const currentLabel =
    activeMode === "focused" && activeFocus
      ? t("generateFocus.current.focused", { focus: activeFocus })
      : isGroup
        ? t("generateFocus.current.generalGroup")
        : t("generateFocus.current.general");

  return (
    <>
      {showChoosePrompt && (
        <div className="rounded-xl border border-border/60 bg-muted/30 p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm text-muted-foreground flex-1">
            {t("generateFocus.choosePrompt")}
          </p>
          <Button
            type="button"
            size="sm"
            className="gap-2 shrink-0 w-full sm:w-auto"
            onClick={() => setFocusDialogOpen(true)}
          >
            <Sparkles className="w-4 h-4" />
            <span>{t("generateFocus.submit")}</span>
          </Button>
        </div>
      )}

      {hasAnyContent && (
        <div className="rounded-xl border border-border/60 bg-card p-3 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {activeMode === "focused" ? (
              <Target className="w-4 h-4 shrink-0 text-primary" />
            ) : (
              <Sparkles className="w-4 h-4 shrink-0 text-primary" />
            )}
            <Badge variant="secondary" className="text-xs truncate max-w-full">
              {currentLabel}
            </Badge>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 shrink-0 w-full sm:w-auto"
            onClick={openChangeFocusDialog}
          >
            <span className="hidden sm:inline">{t("generateFocus.changeButton")}</span>
            <span className="sm:hidden">{t("generateFocus.changeButton")}</span>
          </Button>
        </div>
      )}

      <GenerationFocusDialog
        open={focusDialogOpen}
        onOpenChange={setFocusDialogOpen}
        initialMode={generationMode}
        initialFocus={generationFocus}
        documentId={documentId}
        groupId={groupId}
        required={dialogRequired}
        validationError={focusValidationError}
        onConfirm={handleFocusConfirm}
      />
    </>
  );
}
