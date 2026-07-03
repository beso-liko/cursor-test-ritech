import { createAdminClient } from "@/lib/supabase/server";
import {
  getChatUsageSnapshot,
  type ChatTarget,
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
      code: "LIMIT_EXCEEDED" | "INVALID_TARGET" | "PROFILE_NOT_FOUND";
      usage: ChatUsageSnapshot;
    };

export async function consumeChatResponse(
  userId: string,
  target: ChatTarget
): Promise<ConsumeChatResponseResult> {
  const usage = await getChatUsageSnapshot(userId, target);
  if (!usage.unlimited && usage.remaining != null && usage.remaining <= 0) {
    return { ok: false, code: "LIMIT_EXCEEDED", usage };
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("consume_chat_response", {
    p_user_id: userId,
    p_document_id: "documentId" in target ? target.documentId : null,
    p_group_id: "groupId" in target ? target.groupId : null,
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("CHAT_LIMIT_EXCEEDED")) {
      const refreshed = await getChatUsageSnapshot(userId, target);
      return { ok: false, code: "LIMIT_EXCEEDED", usage: refreshed };
    }
    if (message.includes("PROFILE_NOT_FOUND")) {
      return { ok: false, code: "PROFILE_NOT_FOUND", usage };
    }
    if (message.includes("INVALID_TARGET")) {
      return { ok: false, code: "INVALID_TARGET", usage };
    }
    throw error;
  }

  const refreshed = await getChatUsageSnapshot(userId, target);
  return { ok: true, usage: refreshed };
}

export function formatChatLimitExceededMessage(
  usage: ChatUsageSnapshot
): string {
  if (usage.unlimited) {
    return "Chat limit error. Please try again.";
  }

  const limit = usage.limit ?? 0;
  return `You have reached your monthly chat limit for this file (${usage.used}/${limit} responses used). Wait until next month or contact support.`;
}
