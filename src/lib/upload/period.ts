export function getPeriodKey(timezone: string): string {
  const tz = timezone.trim() || "UTC";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
    }).format(new Date());
  }
}

export function getNextResetDate(timezone: string): Date {
  const tz = timezone.trim() || "UTC";
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);

  const year = Number(parts.find((p) => p.type === "year")?.value ?? now.getUTCFullYear());
  const month = Number(parts.find((p) => p.type === "month")?.value ?? now.getUTCMonth() + 1);

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const utcGuess = Date.UTC(nextYear, nextMonth - 1, 1, 0, 0, 0);
  return new Date(utcGuess);
}

export function formatResetDate(date: Date, timezone: string): string {
  const tz = timezone.trim() || "UTC";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
