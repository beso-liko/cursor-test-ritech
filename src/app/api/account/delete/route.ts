import { NextResponse } from "next/server";
import { deleteUserAccount } from "@/lib/auth/delete-user-account";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { createAdminClient } from "@/lib/supabase/server";

export async function DELETE() {
  try {
    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;

    const admin = createAdminClient();
    const result = await deleteUserAccount(
      admin,
      auth.user.supabaseUserId,
      auth.user.clerkUserId
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete account error:", err);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
