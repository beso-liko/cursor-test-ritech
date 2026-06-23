"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { translations, type Locale } from "@/lib/i18n/translations";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (
    key: keyof (typeof translations)["en"],
    vars?: Record<string, string | number>
  ) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function translate(
  locale: Locale,
  key: keyof (typeof translations)["en"],
  vars?: Record<string, string | number>
): string {
  const dict = translations[locale] ?? translations.en;
  let str: string = dict[key] ?? translations.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }
  return str;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored =
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("lang="))
        ?.split("=")[1] ?? localStorage.getItem("lang");
    if (stored === "sq" || stored === "en") {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem("lang", next);
    document.cookie = `lang=${next}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  const t = useCallback(
    (
      key: keyof (typeof translations)["en"],
      vars?: Record<string, string | number>
    ) => translate(locale, key, vars),
    [locale]
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
