import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("documentId");

  if (!documentId) {
    return NextResponse.json(
      { error: "documentId is required" },
      { status: 400 }
    );
  }

  const supabase = createServerClient();
  const { data } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("document_id", documentId)
    .single();

  return NextResponse.json(data ?? { messages: [] });
}

export async function POST(req: NextRequest) {
  try {
    const { documentId, messages } = await req.json();

    if (!documentId || !messages) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("chat_sessions")
      .upsert(
        { document_id: documentId, messages, updated_at: new Date().toISOString() },
        { onConflict: "document_id" }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("Chat session POST error:", err);
    return NextResponse.json(
      { error: "Failed to save chat session" },
      { status: 500 }
    );
  }
}
