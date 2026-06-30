import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Document } from "@langchain/core/documents";
import { getPineconeIndex } from "@/lib/pinecone";

export async function embedAndStore(
  chunks: string[],
  documentId: string,
  userId: string
): Promise<number> {
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: process.env.OPENAI_API_KEY,
    dimensions: 1024,
  });

  const docs = chunks.map(
    (chunk, i) =>
      new Document({
        pageContent: chunk,
        metadata: { documentId, chunkIndex: i, userId },
      })
  );

  const index = getPineconeIndex();
  await PineconeStore.fromDocuments(docs, embeddings, {
    pineconeIndex: index,
  });

  return chunks.length;
}

export async function deleteDocumentVectors(documentId: string): Promise<void> {
  const index = getPineconeIndex();
  await index.deleteMany({ documentId } as Record<string, string>);
}

export async function deleteUserVectors(userId: string): Promise<void> {
  const index = getPineconeIndex();
  await index.deleteMany({ userId } as Record<string, string>);
}
