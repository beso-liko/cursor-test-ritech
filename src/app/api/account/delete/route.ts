import { NextResponse } from "next/server";
import { createAuthClient, createAdminClient } from "@/lib/supabase/server";

export async function DELETE() {
  try {
    const supabase = await createAuthClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sign out first so the session cookie is cleared before the user record is deleted
    await supabase.auth.signOut();

    // Delete the auth user via the admin client (service role bypasses RLS).
    // All app tables have `user_id references auth.users(id) on delete cascade`,
    // so documents, document_groups, quiz_results, and profiles are removed automatically.
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete account error:", err);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
