export function emailsFromSessionClaims(
  sessionClaims: Record<string, unknown> | null | undefined
): string[] {
  if (!sessionClaims) return [];

  const candidates: unknown[] = [
    sessionClaims.email,
    sessionClaims.primary_email_address,
    sessionClaims.primaryEmailAddress,
  ];

  const nestedEmail = sessionClaims.email_address;
  if (nestedEmail && typeof nestedEmail === "object" && nestedEmail !== null) {
    const primary = (nestedEmail as { primary?: unknown }).primary;
    if (typeof primary === "string") candidates.push(primary);
  }

  return candidates.filter((value): value is string => typeof value === "string");
}

const SUPERUSER_CACHE_KEY = "studybuddy:isSuperuser";

export function readCachedSuperuserFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(SUPERUSER_CACHE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeCachedSuperuserFlag(isSuperuser: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (isSuperuser) {
      sessionStorage.setItem(SUPERUSER_CACHE_KEY, "1");
    } else {
      sessionStorage.removeItem(SUPERUSER_CACHE_KEY);
    }
  } catch {
    // Ignore storage failures (private mode, quota, etc.)
  }
}

export function subscribeToSuperuserCache(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
