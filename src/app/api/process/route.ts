import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { createAdminClient } from "@/lib/supabase/server";
import { extractText } from "@/lib/extractors";
import { splitText } from "@/lib/langchain/splitter";
import { embedAndStore } from "@/lib/langchain/embedder";
import { getOwnedDocument } from "@/lib/supabase/user-queries";
import type { FileType } from "@/lib/supabase/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { filePath, fileName, fileType, documentId } = await req.json();

    if (!filePath || !fileName || !fileType || !documentId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const auth = await requireApiUser();
    if (auth instanceof NextResponse) return auth;

    const owned = await getOwnedDocument(auth.user.supabaseUserId, documentId);
    if (!owned) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(filePath);

    if (downloadError || !fileData) {
      await supabase
        .from("documents")
        .update({ status: "error" })
        .eq("id", documentId);
      return NextResponse.json(
        { error: "Failed to download file" },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    let rawText: string;
    try {
      rawText = await extractText(buffer, fileType as FileType);
    } catch (extractErr) {
      console.error("Extraction error:", extractErr);
      await supabase
        .from("documents")
        .update({ status: "error" })
        .eq("id", documentId);
      const message =
        extractErr instanceof Error ? extractErr.message : "Extraction failed";
      return NextResponse.json({ error: message }, { status: 422 });
    }

    if (!rawText || rawText.length < 50) {
      await supabase
        .from("documents")
        .update({ status: "error" })
        .eq("id", documentId);
      return NextResponse.json(
        {
          error:
            "No readable text was found in this file. " +
            "If it is a scanned PDF or image-only document, " +
            "please export it with a text layer or use a plain-text format.",
        },
        { status: 422 }
      );
    }

    const chunks = await splitText(rawText);
    const chunkCount = await embedAndStore(
      chunks,
      documentId,
      auth.user.supabaseUserId
    );

    await supabase
      .from("documents")
      .update({ status: "ready", chunk_count: chunkCount })
      .eq("id", documentId);

    return NextResponse.json({
      success: true,
      chunkCount,
      textLength: rawText.length,
    });
  } catch (err) {
    console.error("Process error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
