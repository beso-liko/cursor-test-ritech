import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createAdminClient } from "@/lib/supabase/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import { getOwnedDocument, getOwnedGroup } from "@/lib/supabase/user-queries";
import { validateQueryRelevance } from "@/lib/langchain/validate-relevance";
import {
  getStoredGenerationFocus,
  normalizeGenerationFocus,
} from "@/lib/generation/focus";
import {
  consumeChatResponse,
  formatChatLimitExceededMessage,
  isAtChatCap,
} from "@/lib/chat/consume";
import { getChatUsageSnapshot } from "@/lib/chat/limits";

export const maxDuration = 60;

function buildSystemPrompt(
  sourceDesc: string,
  context: string,
  langLine: string,
  generationFocus?: string | null
): string {
  const focusLine = generationFocus
    ? `\n\nThe student's generated study materials (summary, flashcards, and quiz) are focused on: "${generationFocus}". Keep this preference in mind when it helps — you may connect answers to this area when relevant. The student can still ask about any part of the ${sourceDesc}; answer those questions fully using the context below, including material outside the focus area.`
    : "";

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

Use markdown formatting when it improves readability.${focusLine}${langLine}

Context from ${sourceDesc}:
${context}`;
}

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      documentId,
      groupId,
      locale = "en",
      generationFocus: clientGenerationFocus,
    } = await req.json();

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
    const supabase = createAdminClient();
    const isGroup = Boolean(groupId);

    let generationFocus = normalizeGenerationFocus(clientGenerationFocus);
    if (!generationFocus) {
      generationFocus = await getStoredGenerationFocus(
        supabase,
        isGroup,
        documentId,
        groupId
      );
    }

    let relevanceResult: Awaited<ReturnType<typeof validateQueryRelevance>>;

    if (groupId) {
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

      relevanceResult = await validateQueryRelevance(userMessage, {
        documentIds: docIds,
        userId: user.supabaseUserId,
      });
    } else {
      relevanceResult = await validateQueryRelevance(userMessage, {
        documentId,
        userId: user.supabaseUserId,
      });
    }

    if (!relevanceResult.valid) {
      return new Response(JSON.stringify({ error: relevanceResult.error }), { status: 422 });
    }

    const usageSnapshot = await getChatUsageSnapshot(user.supabaseUserId);
    if (isAtChatCap(usageSnapshot)) {
      return new Response(
        JSON.stringify({
          error: formatChatLimitExceededMessage(usageSnapshot),
          code: "chat_limit_exceeded",
          usage: usageSnapshot,
        }),
        { status: 429 }
      );
    }

    const context = relevanceResult.context;

    const langLine =
      locale === "sq"
        ? "\nIMPORTANT: You must respond exclusively in Albanian (Shqip). Do not use any English in your replies."
        : "";

    const sourceDesc = groupId
      ? "study materials (multiple documents)"
      : "document";

    const userId = user.supabaseUserId;

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: buildSystemPrompt(sourceDesc, context, langLine, generationFocus),
      messages,
      temperature: 0.3,
      onFinish: async () => {
        try {
          await consumeChatResponse(userId);
        } catch (err) {
          console.error("Failed to record chat usage after stream:", err);
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (err) {
    console.error("Chat error:", err);
    return new Response(JSON.stringify({ error: "Chat failed" }), {
      status: 500,
    });
  }
}
