import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { createAdminClient } from "@/lib/supabase/server";
import { deleteDocumentVectors } from "@/lib/langchain/embedder";
import { getOwnedDocument } from "@/lib/supabase/user-queries";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;

    const doc = await getOwnedDocument(auth.user.supabaseUserId, id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    return NextResponse.json(doc);
  } catch (err) {
    console.error("Document GET error:", err);
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
    );
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

    const doc = await getOwnedDocument(auth.user.supabaseUserId, id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const body = await req.json();
    const update: Record<string, string | null> = {};

    if ("groupId" in body) {
      update.group_id = body.groupId ?? null;
    }
    if ("fileUrl" in body && typeof body.fileUrl === "string") {
      update.file_url = body.fileUrl;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("documents")
      .update(update)
      .eq("id", id)
      .eq("user_id", auth.user.supabaseUserId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("Document PATCH error:", err);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
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

    const admin = createAdminClient();
    const doc = await getOwnedDocument(auth.user.supabaseUserId, id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await deleteDocumentVectors(id).catch(console.error);

    if (doc.file_url) {
      const path = doc.file_url.split("/").slice(-1)[0];
      await admin.storage.from("documents").remove([path]);
    }

    const { error } = await admin
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("user_id", auth.user.supabaseUserId);

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
