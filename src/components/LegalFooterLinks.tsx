"use client";

import { useLanguage } from "@/components/LanguageProvider";
import { marketingPrivacyUrl, marketingTermsUrl } from "@/lib/site-links";

export default function LegalFooterLinks() {
  const { t } = useLanguage();

  return (
    <div
      className="flex flex-col items-end gap-0.5 px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:gap-1.5 lg:pointer-events-none lg:fixed lg:bottom-4 lg:right-4 lg:z-20 lg:max-w-[min(100%-1.5rem,20rem)] lg:px-0 lg:py-0"
      aria-label={t("footer.legal.label")}
    >
      <a
        href={marketingPrivacyUrl()}
        className="pointer-events-auto text-[10px] leading-tight text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline sm:text-xs"
      >
        {t("footer.legal.privacy")}
      </a>
      <span
        aria-hidden
        className="hidden text-[10px] text-muted-foreground/50 sm:inline sm:text-xs"
      >
        ·
      </span>
      <a
        href={marketingTermsUrl()}
        className="pointer-events-auto text-[10px] leading-tight text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline sm:text-xs"
      >
        {t("footer.legal.terms")}
      </a>
    </div>
  );
}
