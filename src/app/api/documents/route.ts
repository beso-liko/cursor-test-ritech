import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { createAdminClient } from "@/lib/supabase/server";
import { consumeUploadReservation } from "@/lib/upload/reserve";

export async function GET() {
  try {
    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("documents")
      .select("*")
      .eq("user_id", user.supabaseUserId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("Documents GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;
    const { user } = auth;

    const body = await req.json();
    const { name, fileType, groupId, reservationId } = body;

    if (!name || !fileType) {
      return NextResponse.json(
        { error: "name and fileType are required" },
        { status: 400 }
      );
    }

    if (!reservationId || typeof reservationId !== "string") {
      return NextResponse.json(
        { error: "A valid upload reservation is required" },
        { status: 403 }
      );
    }

    const consumed = await consumeUploadReservation(
      reservationId,
      user.supabaseUserId
    );
    if (!consumed) {
      return NextResponse.json(
        { error: "Upload reservation is invalid or expired" },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const safeName = String(name).replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${Date.now()}_${safeName}`;

    const insertData: Record<string, unknown> = {
      name: String(name),
      file_type: fileType,
      status: "processing",
      chunk_count: 0,
      user_id: user.supabaseUserId,
    };
    if (groupId) insertData.group_id = groupId;

    const { data: doc, error: docErr } = await admin
      .from("documents")
      .insert(insertData)
      .select()
      .single();

    if (docErr || !doc) throw docErr ?? new Error("Failed to create document");

    const { data: signed, error: signErr } = await admin.storage
      .from("documents")
      .createSignedUploadUrl(storagePath);

    if (signErr || !signed) {
      await admin.from("documents").delete().eq("id", doc.id);
      throw signErr ?? new Error("Failed to create upload URL");
    }

    return NextResponse.json(
      {
        documentId: doc.id,
        storagePath,
        fileUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/documents/${storagePath}`,
        signedUploadUrl: signed.signedUrl,
        token: signed.token,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Documents POST error:", err);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}
