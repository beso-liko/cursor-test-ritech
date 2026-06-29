import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import {
  isBroadDocumentQuestion,
  retrieveChatContext,
  retrieveChatContextForDocuments,
} from "@/lib/langchain/rag-chain";
import { createAdminClient } from "@/lib/supabase/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { getOwnedDocument, getOwnedGroup } from "@/lib/supabase/user-queries";

export const maxDuration = 60;

// Last-resort block for clearly unrelated queries with no retrieved context.
const RELEVANCE_THRESHOLD = 0.15;

function buildSystemPrompt(sourceDesc: string, context: string, langLine: string): string {
  return `You are a study assistant helping the student understand their uploaded ${sourceDesc}.
Use the context below to answer clearly and concisely. You should help with:
- Summaries and overviews
- Explaining the most important topics, themes, and key concepts
- Specific questions about details in the material
- Clarifying definitions and relationships between ideas

Broad questions like "summarize the main idea", "what are the key concepts?", or \
"explain the most important topic" are always in scope — answer them using the context.

Only decline if the question is clearly unrelated to the uploaded study material \
(e.g. weather, sports, news, or general trivia with no connection to the document). \
In that case, politely explain that you can only help with their uploaded study material.

Use markdown formatting when it improves readability.${langLine}

Context from ${sourceDesc}:
${context}`;
}

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
    const isBroadQuestion = isBroadDocumentQuestion(userMessage);

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

      docsWithScores = await retrieveChatContextForDocuments(
        userMessage,
        docIds,
        user.supabaseUserId
      );
    } else {
      docsWithScores = await retrieveChatContext(userMessage, documentId, user.supabaseUserId);
    }

    if (docsWithScores.length === 0) {
      return new Response(JSON.stringify({ error: "off_topic" }), { status: 422 });
    }

    const maxScore = Math.max(...docsWithScores.map(([, score]) => score));

    // Broad document questions and chat inside a document view are assumed in-scope.
    if (!isBroadQuestion && maxScore < RELEVANCE_THRESHOLD) {
      return new Response(JSON.stringify({ error: "off_topic" }), { status: 422 });
    }

    const context = docsWithScores.map(([doc]) => doc.pageContent).join("\n\n---\n\n");

    const langLine =
      locale === "sq"
        ? "\nIMPORTANT: You must respond exclusively in Albanian (Shqip). Do not use any English in your replies."
        : "";

    const sourceDesc = groupId
      ? "study materials (multiple documents)"
      : "document";

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: buildSystemPrompt(sourceDesc, context, langLine),
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
