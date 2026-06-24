import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const supabase = await createAuthClient();

    // Run sign-in and email existence check in parallel — both server-to-Supabase, low latency
    const admin = createAdminClient();
    const [{ error: authError }, { data: exists }] = await Promise.all([
      supabase.auth.signInWithPassword({ email, password }),
      admin.rpc("check_email_exists", { email_input: email }),
    ]);

    if (authError) {
      const message = exists
        ? "Invalid login credentials."
        : "This user does not exist.";
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
