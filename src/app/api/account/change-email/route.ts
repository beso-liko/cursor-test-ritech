import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createAuthClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const trimmed = email.trim().toLowerCase();
    if (trimmed === user.email) {
      return NextResponse.json({ error: "New email must differ from current email" }, { status: 400 });
    }

    const { error } = await supabase.auth.updateUser({ email: trimmed });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Change email error:", err);
    return NextResponse.json({ error: "Failed to update email" }, { status: 500 });
  }
}
