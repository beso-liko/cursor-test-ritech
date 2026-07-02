import { createAdminClient } from "@/lib/supabase/server";
import { DEFAULT_MONTHLY_UPLOAD_LIMIT } from "@/lib/upload/constants";
import { getPeriodKey } from "@/lib/upload/period";

export interface UploadLimitProfile {
  timezone: string;
  upload_limit_override: number | null;
  upload_unlimited: boolean;
}

export interface UploadUsageSnapshot {
  used: number;
  limit: number | null;
  unlimited: boolean;
  remaining: number | null;
  periodKey: string;
  timezone: string;
}

export function getEffectiveLimit(profile: UploadLimitProfile): number | null {
  if (profile.upload_unlimited) return null;
  if (profile.upload_limit_override != null) return profile.upload_limit_override;
  return DEFAULT_MONTHLY_UPLOAD_LIMIT;
}

export async function getUploadLimitProfile(
  userId: string
): Promise<UploadLimitProfile | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("timezone, upload_limit_override, upload_unlimited")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    timezone: data.timezone ?? "UTC",
    upload_limit_override: data.upload_limit_override,
    upload_unlimited: data.upload_unlimited ?? false,
  };
}

export async function syncTimezone(userId: string, timezone: string): Promise<string> {
  const normalized = timezone.trim() || "UTC";
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      timezone: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw error;
  return normalized;
}

export async function getUsageCount(
  userId: string,
  periodKey: string
): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("upload_usage")
    .select("upload_count")
    .eq("user_id", userId)
    .eq("period_key", periodKey)
    .maybeSingle();

  if (error) throw error;
  return data?.upload_count ?? 0;
}

export async function getUploadUsageSnapshot(
  userId: string,
  timezoneOverride?: string
): Promise<UploadUsageSnapshot> {
  const profile = await getUploadLimitProfile(userId);
  const timezone = timezoneOverride?.trim() || profile?.timezone || "UTC";
  const periodKey = getPeriodKey(timezone);
  const used = await getUsageCount(userId, periodKey);
  const unlimited = profile?.upload_unlimited ?? false;
  const limit = profile ? getEffectiveLimit(profile) : DEFAULT_MONTHLY_UPLOAD_LIMIT;
  const remaining =
    limit == null ? null : Math.max(0, limit - used);

  return {
    used,
    limit,
    unlimited,
    remaining,
    periodKey,
    timezone,
  };
}

export async function resetUsageForUser(
  userId: string,
  periodKey: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("upload_usage").upsert(
    {
      user_id: userId,
      period_key: periodKey,
      upload_count: 0,
    },
    { onConflict: "user_id,period_key" }
  );

  if (error) throw error;
}
