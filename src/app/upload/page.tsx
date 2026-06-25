"use client";

import { ArrowLeft, Sparkles, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import AppShell from "@/components/AppShell";
import FileUploader from "@/components/FileUploader";
import { useLanguage } from "@/components/LanguageProvider";

export default function UploadPage() {
  const { t } = useLanguage();

  const features = [
    {
      icon: Zap,
      title: t("upload.feature.instant.title"),
      desc: t("upload.feature.instant.desc"),
    },
    {
      icon: Sparkles,
      title: t("upload.feature.ai.title"),
      desc: t("upload.feature.ai.desc"),
    },
    {
      icon: ShieldCheck,
      title: t("upload.feature.secure.title"),
      desc: t("upload.feature.secure.desc"),
    },
  ];

  return (
    <AppShell>
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            render={<Link href="/" />}
            className="h-8 w-8"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t("upload.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("upload.subtitle")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Uploader */}
          <div className="md:col-span-3">
            <FileUploader />
          </div>

          {/* Feature sidebar */}
          <div className="md:col-span-2 space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("upload.whatNext")}
            </p>
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
