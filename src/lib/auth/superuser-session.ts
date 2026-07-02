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

/** Remove legacy global superuser cache that could leak across accounts. */
export function clearLegacySuperuserCache(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem("studybuddy:isSuperuser");
  } catch {
    // Ignore storage failures.
  }
}
