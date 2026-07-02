const SUPERUSER_EMAILS = (process.env.SUPERUSER_EMAILS ?? "besoliko88@gmail.com")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function isSuperuserEmail(email: string): boolean {
  return SUPERUSER_EMAILS.includes(email.trim().toLowerCase());
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
  return normalized.some((email) => SUPERUSER_EMAILS.includes(email));
}
