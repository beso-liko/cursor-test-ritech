import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { createAdminClient } from "@/lib/supabase/server";
import { getOwnedNoteFolder } from "@/lib/supabase/note-queries";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;

    const folder = await getOwnedNoteFolder(auth.user.supabaseUserId, id);
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const name =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim().slice(0, 200)
        : null;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("note_folders")
      .update({ name })
      .eq("id", id)
      .eq("user_id", auth.user.supabaseUserId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("Note folder PATCH error:", err);
    return NextResponse.json({ error: "Failed to rename folder" }, { status: 500 });
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

    const folder = await getOwnedNoteFolder(auth.user.supabaseUserId, id);
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const admin = createAdminClient();

    await admin
      .from("notes")
      .update({ folder_id: null })
      .eq("folder_id", id)
      .eq("user_id", auth.user.supabaseUserId);

    const { error } = await admin
      .from("note_folders")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.user.supabaseUserId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Note folder DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
  }
}
