import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { createAdminClient } from "@/lib/supabase/server";
import { getOwnedNoteFolder } from "@/lib/supabase/note-queries";

export async function GET() {
  try {
    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("notes")
      .select("*")
      .eq("user_id", auth.user.supabaseUserId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("Notes GET error:", err);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;

    const body = await req.json().catch(() => ({}));
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : "Untitled";

    let folderId: string | null = null;
    if (body.folder_id != null) {
      if (typeof body.folder_id !== "string") {
        return NextResponse.json({ error: "Invalid folder_id" }, { status: 400 });
      }
      const folder = await getOwnedNoteFolder(auth.user.supabaseUserId, body.folder_id);
      if (!folder) {
        return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      }
      folderId = body.folder_id;
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("notes")
      .insert({
        user_id: auth.user.supabaseUserId,
        title,
        content: body.content ?? {},
        drawing_data: body.drawing_data ?? null,
        folder_id: folderId,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("Notes POST error:", err);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
