import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import {
  formatLimitExceededMessage,
  reserveUploads,
  type LimitExceededReason,
} from "@/lib/upload/reserve";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const count = Number(body.count);
    const timezone =
      typeof body.timezone === "string" ? body.timezone : undefined;

    const result = await reserveUploads(
      auth.user.supabaseUserId,
      count,
      timezone
    );

    if (!result.ok) {
      if (result.code === "LIMIT_EXCEEDED") {
        const reason: LimitExceededReason = result.reason ?? "batch_exceeded";
        return NextResponse.json(
          {
            error: formatLimitExceededMessage(count, result.usage),
            usage: result.usage,
            reason,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: "Invalid upload request", usage: result.usage },
        { status: 400 }
      );
    }

    return NextResponse.json({
      reservationId: result.reservationId,
      usage: result.usage,
    });
  } catch (err) {
    console.error("Upload reserve POST error:", err);
    return NextResponse.json(
      { error: "Failed to reserve uploads" },
      { status: 500 }
    );
  }
}
