import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { createAdminClient } from "@/lib/supabase/server";
import { getOwnedNote } from "@/lib/supabase/note-queries";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;

    const note = await getOwnedNote(auth.user.supabaseUserId, id);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json(note);
  } catch (err) {
    console.error("Note GET error:", err);
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;

    const note = await getOwnedNote(auth.user.supabaseUserId, id);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const body = await req.json();
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof body.title === "string") {
      update.title = body.title.trim() || "Untitled";
    }
    if (body.content !== undefined) {
      update.content = body.content;
    }
    if (body.drawing_data !== undefined) {
      update.drawing_data = body.drawing_data;
    }

    if (Object.keys(update).length <= 1) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("notes")
      .update(update)
      .eq("id", id)
      .eq("user_id", auth.user.supabaseUserId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("Note PATCH error:", err);
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;

    const note = await getOwnedNote(auth.user.supabaseUserId, id);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("notes")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.user.supabaseUserId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Note DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}
