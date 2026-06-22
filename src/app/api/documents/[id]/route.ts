import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { deleteDocumentVectors } from "@/lib/langchain/embedder";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("Document GET error:", err);
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = createServerClient();

    // Get document to find file path
    const { data: doc } = await supabase
      .from("documents")
      .select("file_url")
      .eq("id", id)
      .single();

    // Delete vectors from Pinecone
    await deleteDocumentVectors(id).catch(console.error);

    // Delete file from Supabase Storage
    if (doc?.file_url) {
      const path = doc.file_url.split("/").slice(-1)[0];
      await supabase.storage.from("documents").remove([path]);
    }

    // Delete document record (cascades to summaries, flashcards, quizzes, chat)
    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Document DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
