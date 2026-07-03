import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { getChatUsageSnapshot } from "@/lib/chat/limits";
import { formatResetDate, getNextResetDate } from "@/lib/upload/period";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;

    const documentId = req.nextUrl.searchParams.get("documentId");
    const groupId = req.nextUrl.searchParams.get("groupId");

    if (!documentId && !groupId) {
      return NextResponse.json(
        { error: "documentId or groupId is required" },
        { status: 400 }
      );
    }

    if (documentId && groupId) {
      return NextResponse.json(
        { error: "Provide documentId or groupId, not both" },
        { status: 400 }
      );
    }

    const target = documentId ? { documentId } : { groupId: groupId! };
    const usage = await getChatUsageSnapshot(auth.user.supabaseUserId, target);
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
    console.error("Chat usage GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch chat usage" },
      { status: 500 }
    );
  }
}
