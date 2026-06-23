import { NextRequest } from "next/server";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { retrieveContext, retrieveContextForDocuments } from "@/lib/langchain/rag-chain";
import { createServerClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { messages, documentId, groupId, locale = "en" } = await req.json();

    if (!documentId && !groupId) {
      return new Response(JSON.stringify({ error: "documentId or groupId is required" }), {
        status: 400,
      });
    }

    const userMessage = messages[messages.length - 1]?.content ?? "";

    let context: string;

    if (groupId) {
      const supabase = createServerClient();
      const { data: docs } = await supabase
        .from("documents")
        .select("id")
        .eq("group_id", groupId)
        .eq("status", "ready");

      const docIds = (docs ?? []).map((d: { id: string }) => d.id);

      if (docIds.length === 0) {
        return new Response(JSON.stringify({ error: "No ready documents in this group" }), {
          status: 422,
        });
      }

      const contextDocs = await retrieveContextForDocuments(userMessage, docIds, 5);
      context = contextDocs.map((d) => d.pageContent).join("\n\n---\n\n");
    } else {
      const docs = await retrieveContext(userMessage, documentId, 5);
      context = docs.map((d) => d.pageContent).join("\n\n---\n\n");
    }

    const langLine =
      locale === "sq"
        ? "\nIMPORTANT: You must respond exclusively in Albanian (Shqip). Do not use any English in your replies."
        : "";

    const sourceDesc = groupId
      ? "their study materials (multiple documents)"
      : "their document";

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: `You are an expert study assistant helping a student understand ${sourceDesc}.
Answer questions clearly and concisely based on the provided context.
If the context doesn't contain enough information to answer, say so honestly.
Use markdown formatting for better readability when appropriate.${langLine}

Relevant context from the document(s):
${context}`,
      messages,
      temperature: 0.3,
    });

    return result.toDataStreamResponse();
  } catch (err) {
    console.error("Chat error:", err);
    return new Response(JSON.stringify({ error: "Chat failed" }), {
      status: 500,
    });
  }
}
