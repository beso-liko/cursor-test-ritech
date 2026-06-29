import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import {
  retrieveContextWithScores,
  retrieveContextForDocumentsWithScores,
} from "@/lib/langchain/rag-chain";
import { createAdminClient } from "@/lib/supabase/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { getOwnedDocument, getOwnedGroup } from "@/lib/supabase/user-queries";

export const maxDuration = 60;

// Minimum cosine similarity score used as a last-resort safety net.
// Keep this LOW (0.15) — the hardened system prompt is the primary guardrail.
// Generic meta-questions ("summarize", "what is this about") score around 0.20-0.30
// against specific content, so a high threshold wrongly blocks them.
// Only truly unrelated queries (sports results, weather, etc.) score below 0.15.
const RELEVANCE_THRESHOLD = 0.15;

export async function POST(req: NextRequest) {
  try {
    const { messages, documentId, groupId, locale = "en" } = await req.json();

    if (!documentId && !groupId) {
      return new Response(JSON.stringify({ error: "documentId or groupId is required" }), {
        status: 400,
      });
    }

    const auth = await requireApiUser();
    if (auth instanceof NextResponse) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const { user } = auth;

    if (groupId) {
      const group = await getOwnedGroup(user.supabaseUserId, groupId);
      if (!group) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      }
    } else if (documentId) {
      const doc = await getOwnedDocument(user.supabaseUserId, documentId);
      if (!doc) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      }
    }

    const userMessage = messages[messages.length - 1]?.content ?? "";

    let docsWithScores: [{ pageContent: string; metadata: Record<string, unknown> }, number][];

    if (groupId) {
      const supabase = createAdminClient();
      const { data: docs } = await supabase
        .from("documents")
        .select("id")
        .eq("group_id", groupId)
        .eq("user_id", user.supabaseUserId)
        .eq("status", "ready");

      const docIds = (docs ?? []).map((d: { id: string }) => d.id);

      if (docIds.length === 0) {
        return new Response(JSON.stringify({ error: "No ready documents in this group" }), {
          status: 422,
        });
      }

      docsWithScores = await retrieveContextForDocumentsWithScores(userMessage, docIds, 5, user.supabaseUserId);
    } else {
      docsWithScores = await retrieveContextWithScores(userMessage, documentId, 5, user.supabaseUserId);
    }

    // Layer 1 guardrail: reject questions with no meaningful similarity to the document.
    const maxScore = docsWithScores.length > 0
      ? Math.max(...docsWithScores.map(([, score]) => score))
      : 0;

    if (maxScore < RELEVANCE_THRESHOLD) {
      return new Response(JSON.stringify({ error: "off_topic" }), { status: 422 });
    }

    const context = docsWithScores.map(([doc]) => doc.pageContent).join("\n\n---\n\n");

    const langLine =
      locale === "sq"
        ? "\nIMPORTANT: You must respond exclusively in Albanian (Shqip). Do not use any English in your replies."
        : "";

    const sourceDesc = groupId
      ? "their study materials (multiple documents)"
      : "their document";

    // Layer 2 guardrail: explicit refusal instruction in the system prompt.
    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: `You are a study assistant strictly scoped to the provided document(s).
You MUST ONLY answer questions that are directly about the content in the context below.
If a question is not answerable from the context — including general knowledge, current events, \
or anything unrelated to the document — respond with exactly:
"I can only answer questions about the uploaded material. This question appears to be outside that scope."
Do not attempt to answer off-topic questions under any circumstances.
Answer questions clearly and concisely based on the provided context.
Use markdown formatting for better readability when appropriate.${langLine}

Relevant context from ${sourceDesc}:
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
