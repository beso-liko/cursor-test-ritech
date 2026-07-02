import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { getOwnedDocument, getOwnedGroup } from "@/lib/supabase/user-queries";
import { checkFocusRelevance } from "@/lib/langchain/validate-relevance";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    const { documentId, groupId, focus } = await req.json();

    if (!documentId && !groupId) {
      return NextResponse.json(
        { error: "documentId or groupId is required" },
        { status: 400 }
      );
    }

    const trimmedFocus = typeof focus === "string" ? focus.trim() : "";
    if (!trimmedFocus) {
      return NextResponse.json({ error: "focus is required" }, { status: 400 });
    }

    if (groupId) {
      const group = await getOwnedGroup(user.supabaseUserId, groupId);
      if (!group) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const supabase = createAdminClient();
      const { data: docs } = await supabase
        .from("documents")
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", user.supabaseUserId)
        .eq("status", "ready");

      const docIds = (docs ?? []).map((d: { id: string }) => d.id);
      if (docIds.length === 0) {
        return NextResponse.json(
          { error: "No ready documents in this group" },
          { status: 422 }
        );
      }

      const result = await checkFocusRelevance(trimmedFocus, {
        documentIds: docIds,
        userId: user.supabaseUserId,
      });

      if (!result.valid) {
        return NextResponse.json({ error: result.error }, { status: 422 });
      }

      return NextResponse.json({ valid: true });
    }

    const doc = await getOwnedDocument(user.supabaseUserId, documentId);
    if (!doc) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await checkFocusRelevance(trimmedFocus, {
      documentId,
      userId: user.supabaseUserId,
    });

    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json({ valid: true });
  } catch (err) {
    console.error("Validate focus error:", err);
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
