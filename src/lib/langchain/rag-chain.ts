import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { getPineconeIndex } from "@/lib/pinecone";

function makeEmbeddings() {
  return new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    openAIApiKey: process.env.OPENAI_API_KEY,
    dimensions: 1024,
  });
}

export async function retrieveContext(
  query: string,
  documentId: string,
  topK = 5,
  userId?: string
): Promise<{ pageContent: string; metadata: Record<string, unknown> }[]> {
  const filter: Record<string, unknown> = { documentId };
  if (userId) filter.userId = userId;

  const vectorStore = await PineconeStore.fromExistingIndex(makeEmbeddings(), {
    pineconeIndex: getPineconeIndex(),
    filter,
  });

  const docs = await vectorStore.similaritySearch(query, topK);
  return docs;
}

export async function retrieveContextForDocuments(
  query: string,
  documentIds: string[],
  topK = 8,
  userId?: string
): Promise<{ pageContent: string; metadata: Record<string, unknown> }[]> {
  if (documentIds.length === 1) {
    return retrieveContext(query, documentIds[0], topK, userId);
  }

  const filter: Record<string, unknown> = { documentId: { $in: documentIds } };
  if (userId) filter.userId = userId;

  const vectorStore = await PineconeStore.fromExistingIndex(makeEmbeddings(), {
    pineconeIndex: getPineconeIndex(),
    filter,
  });

  const docs = await vectorStore.similaritySearch(query, topK);
  return docs;
}

export async function getSampleContext(
  documentId: string,
  sampleQuery = "main topics summary overview",
  userId?: string
): Promise<string> {
  const docs = await retrieveContext(sampleQuery, documentId, 8, userId);
  return docs.map((d) => d.pageContent).join("\n\n");
}

export async function getSampleContextForDocuments(
  documentIds: string[],
  sampleQuery = "main topics summary overview",
  userId?: string
): Promise<string> {
  const docs = await retrieveContextForDocuments(sampleQuery, documentIds, 8, userId);
  return docs.map((d) => d.pageContent).join("\n\n");
}
