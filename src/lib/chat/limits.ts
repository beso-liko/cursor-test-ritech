import { createAdminClient } from "@/lib/supabase/server";
import { DEFAULT_MONTHLY_CHAT_LIMIT } from "@/lib/chat/constants";
import { getPeriodKey } from "@/lib/upload/period";

export interface ChatLimitProfile {
  timezone: string;
  chat_limit_override: number | null;
  chat_unlimited: boolean;
}

export interface ChatUsageSnapshot {
  used: number;
  limit: number | null;
  unlimited: boolean;
  remaining: number | null;
  periodKey: string;
  timezone: string;
}

export function getEffectiveChatLimit(profile: ChatLimitProfile): number | null {
  if (profile.chat_unlimited) return null;
  if (profile.chat_limit_override != null) return profile.chat_limit_override;
  return DEFAULT_MONTHLY_CHAT_LIMIT;
}

export async function getChatLimitProfile(
  userId: string
): Promise<ChatLimitProfile | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("timezone, chat_limit_override, chat_unlimited")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    timezone: data.timezone ?? "UTC",
    chat_limit_override: data.chat_limit_override,
    chat_unlimited: data.chat_unlimited ?? false,
  };
}

export async function getChatUsageCount(
  userId: string,
  periodKey: string
): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chat_usage")
    .select("response_count")
    .eq("user_id", userId)
    .eq("period_key", periodKey)
    .maybeSingle();

  if (error) throw error;
  return data?.response_count ?? 0;
}

export async function getChatUsageSnapshot(
  userId: string,
  timezoneOverride?: string
): Promise<ChatUsageSnapshot> {
  const profile = await getChatLimitProfile(userId);
  const timezone = timezoneOverride?.trim() || profile?.timezone || "UTC";
  const periodKey = getPeriodKey(timezone);
  const used = await getChatUsageCount(userId, periodKey);
  const unlimited = profile?.chat_unlimited ?? false;
  const limit = profile ? getEffectiveChatLimit(profile) : DEFAULT_MONTHLY_CHAT_LIMIT;
  const remaining = limit == null ? null : Math.max(0, limit - used);

  return {
    used,
    limit,
    unlimited,
    remaining,
    periodKey,
    timezone,
  };
}

export async function resetChatUsageForUser(
  userId: string,
  periodKey: string
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("chat_usage").upsert(
    {
      user_id: userId,
      period_key: periodKey,
      response_count: 0,
    },
    { onConflict: "user_id,period_key" }
  );

  if (error) throw error;
}
