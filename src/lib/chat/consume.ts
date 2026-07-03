import { createAdminClient } from "@/lib/supabase/server";
import {
  getChatUsageSnapshot,
  type ChatUsageSnapshot,
} from "@/lib/chat/limits";

export function isAtChatCap(usage: ChatUsageSnapshot): boolean {
  if (usage.unlimited) return false;
  if (usage.limit == null) return false;
  return usage.used >= usage.limit;
}

export type ConsumeChatResponseResult =
  | { ok: true; usage: ChatUsageSnapshot }
  | {
      ok: false;
      code: "LIMIT_EXCEEDED" | "PROFILE_NOT_FOUND";
      usage: ChatUsageSnapshot;
    };

export async function consumeChatResponse(
  userId: string
): Promise<ConsumeChatResponseResult> {
  const usage = await getChatUsageSnapshot(userId);
  if (!usage.unlimited && usage.remaining != null && usage.remaining <= 0) {
    return { ok: false, code: "LIMIT_EXCEEDED", usage };
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("consume_chat_response", {
    p_user_id: userId,
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("CHAT_LIMIT_EXCEEDED")) {
      const refreshed = await getChatUsageSnapshot(userId);
      return { ok: false, code: "LIMIT_EXCEEDED", usage: refreshed };
    }
    if (message.includes("PROFILE_NOT_FOUND")) {
      return { ok: false, code: "PROFILE_NOT_FOUND", usage };
    }
    if (
      message.includes("ON CONFLICT") ||
      error.code === "42P10"
    ) {
      return consumeChatResponseDirect(userId, usage);
    }
    throw error;
  }

  const refreshed = await getChatUsageSnapshot(userId);
  return { ok: true, usage: refreshed };
}

/** Fallback when the RPC hits a missing unique constraint on chat_usage. */
async function consumeChatResponseDirect(
  userId: string,
  usage: ChatUsageSnapshot
): Promise<ConsumeChatResponseResult> {
  if (!usage.unlimited && usage.remaining != null && usage.remaining <= 0) {
    return { ok: false, code: "LIMIT_EXCEEDED", usage };
  }

  const admin = createAdminClient();
  const { data: existing, error: selectError } = await admin
    .from("chat_usage")
    .select("response_count")
    .eq("user_id", userId)
    .eq("period_key", usage.periodKey)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existing) {
    if (
      !usage.unlimited &&
      usage.limit != null &&
      existing.response_count >= usage.limit
    ) {
      return { ok: false, code: "LIMIT_EXCEEDED", usage };
    }

    const { error: updateError } = await admin
      .from("chat_usage")
      .update({ response_count: existing.response_count + 1 })
      .eq("user_id", userId)
      .eq("period_key", usage.periodKey);

    if (updateError) throw updateError;
  } else {
    const { error: insertError } = await admin.from("chat_usage").insert({
      user_id: userId,
      period_key: usage.periodKey,
      response_count: 1,
    });

    if (insertError) throw insertError;
  }

  const refreshed = await getChatUsageSnapshot(userId);
  return { ok: true, usage: refreshed };
}

export function formatChatLimitExceededMessage(
  usage: ChatUsageSnapshot
): string {
  if (usage.unlimited) {
    return "Chat limit error. Please try again.";
  }

  const limit = usage.limit ?? 0;
  return `You have reached your monthly chat limit (${usage.used}/${limit} responses used). Wait until next month or contact support.`;
}
