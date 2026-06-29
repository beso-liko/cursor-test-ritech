import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.supabaseUserId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      email: user.email,
      first_name: data?.first_name ?? user.firstName,
      last_name: data?.last_name ?? user.lastName,
    });
  } catch (err) {
    console.error("Account GET error:", err);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    const body = await req.json();
    const first_name =
      typeof body.first_name === "string" ? body.first_name.trim().slice(0, 100) : null;
    const last_name =
      typeof body.last_name === "string" ? body.last_name.trim().slice(0, 100) : null;

    const admin = createAdminClient();
    const { error } = await admin.from("profiles").upsert(
      {
        id: user.supabaseUserId,
        first_name,
        last_name,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Account PATCH error:", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
