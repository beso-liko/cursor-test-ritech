import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { createAdminClient } from "@/lib/supabase/server";
import { getOwnedGroup } from "@/lib/supabase/user-queries";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;

    const group = await getOwnedGroup(auth.user.supabaseUserId, id);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const admin = createAdminClient();
    const { data: documents } = await admin
      .from("documents")
      .select("*")
      .eq("group_id", id)
      .eq("user_id", auth.user.supabaseUserId)
      .order("created_at", { ascending: true });

    return NextResponse.json({ ...group, documents: documents ?? [] });
  } catch (err) {
    console.error("Document group GET error:", err);
    return NextResponse.json({ error: "Failed to fetch group" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;

    const group = await getOwnedGroup(auth.user.supabaseUserId, id);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const { name } = await req.json();
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("document_groups")
      .update({ name: name.trim().slice(0, 200) })
      .eq("id", id)
      .eq("user_id", auth.user.supabaseUserId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("Document group PATCH error:", err);
    return NextResponse.json({ error: "Failed to rename folder" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;

    const group = await getOwnedGroup(auth.user.supabaseUserId, id);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const admin = createAdminClient();

    await admin
      .from("documents")
      .update({ group_id: null })
      .eq("group_id", id)
      .eq("user_id", auth.user.supabaseUserId);

    const { error } = await admin
      .from("document_groups")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.user.supabaseUserId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Document group DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
  }
}
