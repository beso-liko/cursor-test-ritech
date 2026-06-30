import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { createAdminClient } from "@/lib/supabase/server";

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

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("notes")
      .insert({
        user_id: auth.user.supabaseUserId,
        title,
        content: body.content ?? {},
        drawing_data: body.drawing_data ?? null,
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
