import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import {
  getUploadUsageSnapshot,
  syncTimezone,
} from "@/lib/upload/limits";
import { formatResetDate, getNextResetDate } from "@/lib/upload/period";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;

    const timezoneParam = req.nextUrl.searchParams.get("timezone");
    if (timezoneParam) {
      await syncTimezone(auth.user.supabaseUserId, timezoneParam);
    }

    const usage = await getUploadUsageSnapshot(
      auth.user.supabaseUserId,
      timezoneParam ?? undefined
    );
    const resetsOn = formatResetDate(
      getNextResetDate(usage.timezone),
      usage.timezone
    );

    return NextResponse.json({
      used: usage.used,
      limit: usage.limit,
      unlimited: usage.unlimited,
      remaining: usage.remaining,
      periodKey: usage.periodKey,
      timezone: usage.timezone,
      resetsOn,
    });
  } catch (err) {
    console.error("Upload usage GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch upload usage" },
      { status: 500 }
    );
  }
}
