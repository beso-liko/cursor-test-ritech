import { NextResponse } from "next/server";
import { requireSuperuser } from "@/lib/auth/require-superuser";
import { createAdminClient } from "@/lib/supabase/server";
import {
  getEffectiveLimit,
  getUsageCount,
} from "@/lib/upload/limits";
import { getEffectiveChatLimit } from "@/lib/chat/limits";
import { getPeriodKey } from "@/lib/upload/period";

export async function GET() {
  try {
    const auth = await requireSuperuser();
    if (auth instanceof NextResponse) return auth;

    const admin = createAdminClient();
    const { data: profiles, error } = await admin
      .from("profiles")
      .select(
        "id, email, timezone, upload_limit_override, upload_unlimited, chat_limit_override, chat_unlimited"
      )
      .not("email", "is", null)
      .order("email", { ascending: true });

    if (error) throw error;

    const users = await Promise.all(
      (profiles ?? []).map(async (profile) => {
        const timezone = profile.timezone ?? "UTC";
        const periodKey = getPeriodKey(timezone);
        const uploadUsed = await getUsageCount(profile.id, periodKey);
        const uploadProfile = {
          timezone,
          upload_limit_override: profile.upload_limit_override,
          upload_unlimited: profile.upload_unlimited ?? false,
        };
        const chatProfile = {
          timezone,
          chat_limit_override: profile.chat_limit_override,
          chat_unlimited: profile.chat_unlimited ?? false,
        };

        return {
          id: profile.id,
          email: profile.email,
          timezone,
          uploadUsed,
          uploadLimit: getEffectiveLimit(uploadProfile),
          uploadUnlimited: uploadProfile.upload_unlimited,
          chatLimit: getEffectiveChatLimit(chatProfile),
          chatUnlimited: chatProfile.chat_unlimited,
          periodKey,
        };
      })
    );

    return NextResponse.json({ users });
  } catch (err) {
    console.error("Admin users GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
