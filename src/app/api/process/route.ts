import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { extractText } from "@/lib/extractors";
import { splitText } from "@/lib/langchain/splitter";
import { embedAndStore } from "@/lib/langchain/embedder";
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

    const supabase = createServerClient();

    // Download file from Supabase Storage
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

    // Extract text
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
        { error: "Could not extract text from file" },
        { status: 422 }
      );
    }

    // Split into chunks
    const chunks = await splitText(rawText);

    // Embed and store in Pinecone
    const chunkCount = await embedAndStore(chunks, documentId);

    // Update document status in Supabase
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
