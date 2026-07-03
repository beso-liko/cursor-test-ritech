import { NextRequest, NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth/require-superuser";
import { createAdminClient } from "@/lib/supabase/server";
import { resetChatUsageForUser, getEffectiveChatLimit } from "@/lib/chat/limits";
import {
  getEffectiveLimit,
  getUsageCount,
  resetUsageForUser,
} from "@/lib/upload/limits";
import { getPeriodKey } from "@/lib/upload/period";

type AdminAction =
  | { action: "set_limit"; limit: number }
  | { action: "reset_limit" }
  | { action: "remove_limit" }
  | { action: "reset_usage" }
  | { action: "set_chat_limit"; limit: number }
  | { action: "reset_chat_limit" }
  | { action: "remove_chat_limit" }
  | { action: "reset_chat_usage" };

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperuser();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = (await req.json()) as AdminAction;
    const admin = createAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select(
        "id, email, timezone, upload_limit_override, upload_unlimited, chat_limit_override, chat_unlimited"
      )
      .eq("id", id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const timezone = profile.timezone ?? "UTC";
    const periodKey = getPeriodKey(timezone);

    if (body.action === "set_limit") {
      const limit = Number(body.limit);
      if (!Number.isInteger(limit) || limit < 0) {
        return NextResponse.json(
          { error: "Limit must be a non-negative integer" },
          { status: 400 }
        );
      }

      const { error } = await admin
        .from("profiles")
        .update({
          upload_limit_override: limit,
          upload_unlimited: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    } else if (body.action === "reset_limit") {
      const { error } = await admin
        .from("profiles")
        .update({
          upload_limit_override: null,
          upload_unlimited: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    } else if (body.action === "reset_usage") {
      await resetUsageForUser(id, periodKey);
    } else if (body.action === "remove_limit") {
      const { error } = await admin
        .from("profiles")
        .update({
          upload_unlimited: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    } else if (body.action === "set_chat_limit") {
      const limit = Number(body.limit);
      if (!Number.isInteger(limit) || limit < 0) {
        return NextResponse.json(
          { error: "Limit must be a non-negative integer" },
          { status: 400 }
        );
      }

      const { error } = await admin
        .from("profiles")
        .update({
          chat_limit_override: limit,
          chat_unlimited: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    } else if (body.action === "reset_chat_limit") {
      const { error } = await admin
        .from("profiles")
        .update({
          chat_limit_override: null,
          chat_unlimited: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    } else if (body.action === "remove_chat_limit") {
      const { error } = await admin
        .from("profiles")
        .update({
          chat_unlimited: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    } else if (body.action === "reset_chat_usage") {
      await resetChatUsageForUser(id, periodKey);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const { data: updatedProfile, error: updatedError } = await admin
      .from("profiles")
      .select(
        "id, email, timezone, upload_limit_override, upload_unlimited, chat_limit_override, chat_unlimited"
      )
      .eq("id", id)
      .single();

    if (updatedError) throw updatedError;

    const uploadUsed = await getUsageCount(id, periodKey);
    const uploadProfile = {
      timezone: updatedProfile.timezone ?? "UTC",
      upload_limit_override: updatedProfile.upload_limit_override,
      upload_unlimited: updatedProfile.upload_unlimited ?? false,
    };
    const chatProfile = {
      timezone: updatedProfile.timezone ?? "UTC",
      chat_limit_override: updatedProfile.chat_limit_override,
      chat_unlimited: updatedProfile.chat_unlimited ?? false,
    };

    return NextResponse.json({
      user: {
        id: updatedProfile.id,
        email: updatedProfile.email,
        timezone: uploadProfile.timezone,
        uploadUsed,
        uploadLimit: getEffectiveLimit(uploadProfile),
        uploadUnlimited: uploadProfile.upload_unlimited,
        chatLimit: getEffectiveChatLimit(chatProfile),
        chatUnlimited: chatProfile.chat_unlimited,
        periodKey,
      },
    });
  } catch (err) {
    console.error("Admin user PATCH error:", err);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
