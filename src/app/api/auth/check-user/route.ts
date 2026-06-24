import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;

    if (!email) {
      return NextResponse.json({ exists: false });
    }

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_email_exists", {
      email_input: email,
    });

    if (error) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({ exists: Boolean(data) });
  } catch {
    return NextResponse.json({ exists: false });
  }
}
