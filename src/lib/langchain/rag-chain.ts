import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { getPineconeIndex } from "@/lib/pinecone";

export async function retrieveContext(
  query: string,
  documentId: string,
  topK = 5
): Promise<{ pageContent: string; metadata: Record<string, unknown> }[]> {
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    openAIApiKey: process.env.OPENAI_API_KEY,
    dimensions: 1024,
  });

  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: getPineconeIndex(),
    filter: { documentId },
  });

  const docs = await vectorStore.similaritySearch(query, topK);
  return docs;
}

export async function getSampleContext(
  documentId: string,
  sampleQuery = "main topics summary overview"
): Promise<string> {
  const docs = await retrieveContext(sampleQuery, documentId, 8);
  return docs.map((d) => d.pageContent).join("\n\n");
}
