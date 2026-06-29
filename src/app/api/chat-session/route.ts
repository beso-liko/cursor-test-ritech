import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { createAdminClient } from "@/lib/supabase/server";
import { getOwnedDocument, getOwnedGroup } from "@/lib/supabase/user-queries";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("documentId");
  const groupId = searchParams.get("groupId");

  if (!documentId && !groupId) {
    return NextResponse.json(
      { error: "documentId or groupId is required" },
      { status: 400 }
    );
  }

  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  if (groupId) {
    const group = await getOwnedGroup(auth.user.supabaseUserId, groupId);
    if (!group) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (documentId) {
    const doc = await getOwnedDocument(auth.user.supabaseUserId, documentId);
    if (!doc) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const query = groupId
    ? admin.from("chat_sessions").select("*").eq("group_id", groupId).single()
    : admin.from("chat_sessions").select("*").eq("document_id", documentId).single();

  const { data } = await query;
  return NextResponse.json(data ?? { messages: [] });
}

export async function POST(req: NextRequest) {
  try {
    const { documentId, groupId, messages } = await req.json();

    if ((!documentId && !groupId) || !messages) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;

    if (groupId) {
      const group = await getOwnedGroup(auth.user.supabaseUserId, groupId);
      if (!group) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else if (documentId) {
      const doc = await getOwnedDocument(auth.user.supabaseUserId, documentId);
      if (!doc) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();

    const existingQuery = groupId
      ? admin.from("chat_sessions").select("id").eq("group_id", groupId).single()
      : admin.from("chat_sessions").select("id").eq("document_id", documentId).single();

    const { data: existing } = await existingQuery;

    let result;
    if (existing) {
      const updateQuery = groupId
        ? admin
            .from("chat_sessions")
            .update({ messages, updated_at: now })
            .eq("group_id", groupId)
            .select()
            .single()
        : admin
            .from("chat_sessions")
            .update({ messages, updated_at: now })
            .eq("document_id", documentId)
            .select()
            .single();

      const { data, error } = await updateQuery;
      if (error) throw error;
      result = data;
    } else {
      const row = groupId
        ? { group_id: groupId, messages, updated_at: now }
        : { document_id: documentId, messages, updated_at: now };

      const { data, error } = await admin
        .from("chat_sessions")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(row as any)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Chat session POST error:", err);
    return NextResponse.json(
      { error: "Failed to save chat session" },
      { status: 500 }
    );
  }
}
