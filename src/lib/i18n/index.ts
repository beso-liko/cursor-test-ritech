import { cookies } from "next/headers";
import { translations, type Locale } from "./translations";

export type { Locale };

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const lang = cookieStore.get("lang")?.value;
  return lang === "sq" ? "sq" : "en";
}

export function makeT(locale: Locale) {
  return function t(
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
  };
}
