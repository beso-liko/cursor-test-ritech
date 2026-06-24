import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createAuthClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      email: user.email,
      first_name: data?.first_name ?? null,
      last_name: data?.last_name ?? null,
    });
  } catch (err) {
    console.error("Account GET error:", err);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createAuthClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const first_name = typeof body.first_name === "string" ? body.first_name.trim().slice(0, 100) : null;
    const last_name = typeof body.last_name === "string" ? body.last_name.trim().slice(0, 100) : null;

    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: user.id, first_name, last_name, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Account PATCH error:", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
