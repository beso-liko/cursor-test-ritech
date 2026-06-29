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
    const { data, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) {
      return NextResponse.json({ exists: false });
    }

    const normalized = email.toLowerCase();
    const exists = data.users.some((user) => {
      if (user.email?.toLowerCase() === normalized) return true;
      return (user.identities ?? []).some(
        (identity) =>
          typeof identity.identity_data?.email === "string" &&
          identity.identity_data.email.toLowerCase() === normalized
      );
    });

    return NextResponse.json({ exists });
  } catch {
    return NextResponse.json({ exists: false });
  }
}
