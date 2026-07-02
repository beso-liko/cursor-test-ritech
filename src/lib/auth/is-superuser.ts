const DEFAULT_SUPERUSER_EMAILS = "besoliko88@gmail.com";

function parseSuperuserEmails(raw: string | undefined): string[] {
  return (raw ?? DEFAULT_SUPERUSER_EMAILS)
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/** Server-side list (SUPERUSER_EMAILS). */
export function getSuperuserEmails(): readonly string[] {
  return parseSuperuserEmails(process.env.SUPERUSER_EMAILS);
}

/** Client-safe list (NEXT_PUBLIC_SUPERUSER_EMAILS, same default). */
export function getClientSuperuserEmails(): readonly string[] {
  return parseSuperuserEmails(process.env.NEXT_PUBLIC_SUPERUSER_EMAILS);
}

export function isSuperuserEmail(email: string): boolean {
  return getSuperuserEmails().includes(email.trim().toLowerCase());
}

/** Match if any provided email belongs to a superuser (Clerk or Supabase). */
export function isSuperuser(...emails: Array<string | null | undefined>): boolean {
  const normalized = [
    ...new Set(
      emails
        .filter((email): email is string => Boolean(email?.trim()))
        .map((email) => email.trim().toLowerCase())
    ),
  ];
  const allowed = getSuperuserEmails();
  return normalized.some((email) => allowed.includes(email));
}

/** Client-side check using Clerk emails only (no API round trip). */
export function isSuperuserFromClerkEmails(
  ...emails: Array<string | null | undefined>
): boolean {
  const normalized = [
    ...new Set(
      emails
        .filter((email): email is string => Boolean(email?.trim()))
        .map((email) => email.trim().toLowerCase())
    ),
  ];
  const allowed = getClientSuperuserEmails();
  return normalized.some((email) => allowed.includes(email));
}
