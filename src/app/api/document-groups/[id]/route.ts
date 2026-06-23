import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createAdminClient } from "@/lib/supabase/server";
import { deleteDocumentVectors } from "@/lib/langchain/embedder";

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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createAuthClient();
    const admin = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all documents in the group (RLS ensures group belongs to user)
    const { data: docs } = await supabase
      .from("documents")
      .select("id, file_url")
      .eq("group_id", id);

    if (docs && docs.length > 0) {
      await Promise.allSettled(
        docs.map(async (doc: { id: string; file_url: string | null }) => {
          await deleteDocumentVectors(doc.id).catch(console.error);
          if (doc.file_url) {
            const path = doc.file_url.split("/").slice(-1)[0];
            await admin.storage.from("documents").remove([path]);
          }
        })
      );
    }

    // Delete the group (cascades to documents → summaries/flashcards/quizzes)
    const { error } = await supabase
      .from("document_groups")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Document group DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}
