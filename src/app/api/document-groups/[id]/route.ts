import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createAuthClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [{ data: group }, { data: documents }] = await Promise.all([
      supabase.from("document_groups").select("*").eq("id", id).single(),
      supabase
        .from("documents")
        .select("*")
        .eq("group_id", id)
        .order("created_at", { ascending: true }),
    ]);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

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
    const supabase = await createAuthClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("document_groups")
      .update({ name: name.trim().slice(0, 200) })
      .eq("id", id)
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
    const supabase = await createAuthClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Unlink all documents from the folder (keep them as unfiled)
    await supabase
      .from("documents")
      .update({ group_id: null })
      .eq("group_id", id);

    // Delete the folder row — cascades to group-level summaries, flashcards,
    // quizzes, and chat sessions but leaves the individual documents intact.
    const { error } = await supabase
      .from("document_groups")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Document group DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 });
  }
}
