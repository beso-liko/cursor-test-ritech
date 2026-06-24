import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";

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

  const supabase = await createAuthClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = groupId
    ? supabase.from("chat_sessions").select("*").eq("group_id", groupId).single()
    : supabase.from("chat_sessions").select("*").eq("document_id", documentId).single();

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

    const supabase = await createAuthClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date().toISOString();

    // Check if a session already exists, then update or insert
    const existingQuery = groupId
      ? supabase.from("chat_sessions").select("id").eq("group_id", groupId).single()
      : supabase.from("chat_sessions").select("id").eq("document_id", documentId).single();

    const { data: existing } = await existingQuery;

    let result;
    if (existing) {
      const updateQuery = groupId
        ? supabase
            .from("chat_sessions")
            .update({ messages, updated_at: now })
            .eq("group_id", groupId)
            .select()
            .single()
        : supabase
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase
        .from("chat_sessions")
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
