import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : null;

    if (!email) {
      return NextResponse.json({ exists: false });
    }

    const admin = createAdminClient();

    const { data: rpcExists, error: rpcError } = await admin.rpc(
      "check_email_exists",
      { email_input: email }
    );

    if (!rpcError && rpcExists === true) {
      return NextResponse.json({ exists: true });
    }

    const { data: profileMatch } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (profileMatch) {
      return NextResponse.json({ exists: true });
    }

    let page = 1;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: 100,
      });

      if (error || !data.users.length) {
        break;
      }

      const exists = data.users.some((user) => {
        if (user.email?.toLowerCase() === email) return true;

        return (user.identities ?? []).some(
          (identity) =>
            typeof identity.identity_data?.email === "string" &&
            identity.identity_data.email.toLowerCase() === email
        );
      });

      if (exists) {
        return NextResponse.json({ exists: true });
      }

      if (data.users.length < 100) break;
      page += 1;
    }

    return NextResponse.json({ exists: false });
  } catch {
    return NextResponse.json({ exists: false });
  }
}
