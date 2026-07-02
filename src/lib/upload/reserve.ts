import { createAdminClient } from "@/lib/supabase/server";
import {
  getUploadUsageSnapshot,
  syncTimezone,
} from "@/lib/upload/limits";
import { isAtUploadCap } from "@/lib/upload/is-at-cap";

export type LimitExceededReason = "at_cap" | "batch_exceeded";

export type ReserveUploadsResult =
  | { ok: true; reservationId: string; usage: Awaited<ReturnType<typeof getUploadUsageSnapshot>> }
  | {
      ok: false;
      code: "LIMIT_EXCEEDED" | "INVALID_COUNT" | "PROFILE_NOT_FOUND";
      reason?: LimitExceededReason;
      usage: Awaited<ReturnType<typeof getUploadUsageSnapshot>>;
    };

export async function reserveUploads(
  userId: string,
  count: number,
  timezone?: string
): Promise<ReserveUploadsResult> {
  if (!Number.isInteger(count) || count <= 0) {
    const usage = await getUploadUsageSnapshot(userId, timezone);
    return { ok: false, code: "INVALID_COUNT", usage };
  }

  if (timezone) {
    await syncTimezone(userId, timezone);
  }

  const usage = await getUploadUsageSnapshot(userId, timezone);
  if (!usage.unlimited && usage.remaining != null && count > usage.remaining) {
    return {
      ok: false,
      code: "LIMIT_EXCEEDED",
      reason: isAtUploadCap(usage) ? "at_cap" : "batch_exceeded",
      usage,
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reserve_uploads", {
    p_user_id: userId,
    p_count: count,
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("UPLOAD_LIMIT_EXCEEDED")) {
      const refreshed = await getUploadUsageSnapshot(userId, timezone);
      return {
        ok: false,
        code: "LIMIT_EXCEEDED",
        reason: isAtUploadCap(refreshed) ? "at_cap" : "batch_exceeded",
        usage: refreshed,
      };
    }
    if (message.includes("PROFILE_NOT_FOUND")) {
      return { ok: false, code: "PROFILE_NOT_FOUND", usage };
    }
    if (message.includes("INVALID_COUNT")) {
      return { ok: false, code: "INVALID_COUNT", usage };
    }
    throw error;
  }

  const refreshed = await getUploadUsageSnapshot(userId, timezone);
  return {
    ok: true,
    reservationId: data as string,
    usage: refreshed,
  };
}

export async function consumeUploadReservation(
  reservationId: string,
  userId: string
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_upload_reservation", {
    p_reservation_id: reservationId,
    p_user_id: userId,
  });

  if (error) throw error;
  return Boolean(data);
}

export function formatLimitExceededMessage(
  requested: number,
  usage: Awaited<ReturnType<typeof getUploadUsageSnapshot>>
): string {
  if (usage.unlimited) {
    return "Upload limit error. Please try again.";
  }

  const remaining = usage.remaining ?? 0;
  const limit = usage.limit ?? 0;

  if (remaining <= 0 || isAtUploadCap(usage)) {
    return `You have reached your monthly upload limit (${usage.used}/${limit} used). Wait until next month or contact support.`;
  }

  return `You can only upload ${remaining} more file(s) this month (${usage.used}/${limit} used). You selected ${requested} file(s). Remove files from this batch or wait until next month.`;
}
