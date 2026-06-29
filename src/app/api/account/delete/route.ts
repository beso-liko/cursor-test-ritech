import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { createAdminClient } from "@/lib/supabase/server";

export async function DELETE() {
  try {
    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(auth.user.supabaseUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const client = await clerkClient();
    await client.users.deleteUser(auth.user.clerkUserId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete account error:", err);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
