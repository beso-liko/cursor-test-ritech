import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { createAdminClient } from "@/lib/supabase/server";
import { getOwnedDocument, getOwnedGroup } from "@/lib/supabase/user-queries";

export async function GET(req: NextRequest) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const documentId = searchParams.get("documentId");
  const groupId = searchParams.get("groupId");

  if (!type || (!documentId && !groupId)) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  if (groupId) {
    const group = await getOwnedGroup(auth.user.supabaseUserId, groupId);
    if (!group) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } else if (documentId) {
    const doc = await getOwnedDocument(auth.user.supabaseUserId, documentId);
    if (!doc) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  if (type === "summary") {
    const query = groupId
      ? admin.from("summaries").select("*").eq("group_id", groupId).single()
      : admin.from("summaries").select("*").eq("document_id", documentId).single();
    const { data } = await query;
    return NextResponse.json(data);
  }

  if (type === "flashcards") {
    const query = groupId
      ? admin.from("flashcards").select("*").eq("group_id", groupId)
      : admin.from("flashcards").select("*").eq("document_id", documentId);
    const { data } = await query;
    return NextResponse.json(data ?? []);
  }

  if (type === "quiz") {
    const query = groupId
      ? admin.from("quizzes").select("*").eq("group_id", groupId).single()
      : admin.from("quizzes").select("*").eq("document_id", documentId).single();
    const { data } = await query;
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
