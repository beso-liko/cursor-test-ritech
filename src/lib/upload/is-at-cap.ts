export interface UploadCapUsage {
  unlimited?: boolean;
  used?: number;
  limit?: number | null;
  remaining?: number | null;
}

/** True when the user has used their full monthly allowance (any limit, not just 15). */
export function isAtUploadCap(usage: UploadCapUsage | null | undefined): boolean {
  if (!usage || usage.unlimited || usage.limit == null) return false;
  if (typeof usage.used === "number" && usage.used >= usage.limit) return true;
  if (usage.remaining != null && usage.remaining <= 0) return true;
  return false;
}

export type LimitExceededReason = "at_cap" | "batch_exceeded";

export function getLimitExceededReason(
  requested: number,
  usage: UploadCapUsage
): LimitExceededReason {
  if (isAtUploadCap(usage)) return "at_cap";
  if (
    !usage.unlimited &&
    usage.limit != null &&
    usage.remaining != null &&
    requested > usage.remaining
  ) {
    return "batch_exceeded";
  }
  return "at_cap";
}

/** True when a reserve/upload-limit API error means the monthly cap is fully used. */
export function isUploadLimitAtCapError(
  err: { reason?: string; usage?: UploadCapUsage | null },
  currentUsage?: UploadCapUsage | null
): boolean {
  if (err.reason === "at_cap") return true;
  if (isAtUploadCap(err.usage ?? currentUsage)) return true;
  return false;
}
