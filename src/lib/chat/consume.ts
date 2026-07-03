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
    throw error;
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
