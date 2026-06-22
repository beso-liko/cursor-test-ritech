import { NextRequest } from "next/server";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { retrieveContext } from "@/lib/langchain/rag-chain";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { messages, documentId } = await req.json();

    if (!documentId) {
      return new Response(JSON.stringify({ error: "documentId is required" }), {
        status: 400,
      });
    }

    const userMessage = messages[messages.length - 1]?.content ?? "";

    // Retrieve relevant context from Pinecone
    const docs = await retrieveContext(userMessage, documentId, 5);
    const context = docs.map((d) => d.pageContent).join("\n\n---\n\n");

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: `You are an expert study assistant helping a student understand their document.
Answer questions clearly and concisely based on the provided context.
If the context doesn't contain enough information to answer, say so honestly.
Use markdown formatting for better readability when appropriate.

Relevant context from the document:
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
