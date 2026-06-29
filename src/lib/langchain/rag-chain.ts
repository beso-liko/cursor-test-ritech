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

type ScoredDoc = [{ pageContent: string; metadata: Record<string, unknown> }, number];

const BROAD_RETRIEVAL_QUERY =
  "main topics summary overview key concepts important themes central ideas";

/** Broad questions about the document itself (summaries, key topics, etc.). */
export function isBroadDocumentQuestion(query: string): boolean {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return false;

  return (
    /\b(summari[sz]e|summary|overview|main idea|key concept|important topic|most important|core theme|central theme|big picture|what is this about|what's this about|tell me about this|explain this document|explain the document)\b/i.test(
      normalized
    ) ||
    /\b(përmbledh|përmbledhni|ide(kryesore)?|konceptet kryesore|tema më e rëndësishme|temën më të rëndësishme|çfarë është)\b/i.test(
      normalized
    )
  );
}

function mergeScoredDocs(...resultSets: ScoredDoc[][]): ScoredDoc[] {
  const byContent = new Map<string, ScoredDoc>();

  for (const results of resultSets) {
    for (const doc of results) {
      const key = doc[0].pageContent;
      const existing = byContent.get(key);
      if (!existing || doc[1] > existing[1]) {
        byContent.set(key, doc);
      }
    }
  }

  return [...byContent.values()].sort((a, b) => b[1] - a[1]);
}

export async function retrieveChatContext(
  query: string,
  documentId: string,
  userId?: string,
  topK = 8
): Promise<ScoredDoc[]> {
  const specific = await retrieveContextWithScores(query, documentId, topK, userId);

  if (isBroadDocumentQuestion(query)) {
    const broad = await retrieveContextWithScores(
      BROAD_RETRIEVAL_QUERY,
      documentId,
      topK,
      userId
    );
    return mergeScoredDocs(broad, specific).slice(0, topK);
  }

  const maxScore = specific.length > 0 ? Math.max(...specific.map(([, score]) => score)) : 0;
  if (maxScore < 0.15) {
    const broad = await retrieveContextWithScores(
      BROAD_RETRIEVAL_QUERY,
      documentId,
      topK,
      userId
    );
    return mergeScoredDocs(broad, specific).slice(0, topK);
  }

  return specific;
}

export async function retrieveChatContextForDocuments(
  query: string,
  documentIds: string[],
  userId?: string,
  topK = 10
): Promise<ScoredDoc[]> {
  const specific = await retrieveContextForDocumentsWithScores(
    query,
    documentIds,
    topK,
    userId
  );

  if (isBroadDocumentQuestion(query)) {
    const broad = await retrieveContextForDocumentsWithScores(
      BROAD_RETRIEVAL_QUERY,
      documentIds,
      topK,
      userId
    );
    return mergeScoredDocs(broad, specific).slice(0, topK);
  }

  const maxScore = specific.length > 0 ? Math.max(...specific.map(([, score]) => score)) : 0;
  if (maxScore < 0.15) {
    const broad = await retrieveContextForDocumentsWithScores(
      BROAD_RETRIEVAL_QUERY,
      documentIds,
      topK,
      userId
    );
    return mergeScoredDocs(broad, specific).slice(0, topK);
  }

  return specific;
}

export async function retrieveContextWithScores(
  query: string,
  documentId: string,
  topK = 5,
  userId?: string
): Promise<ScoredDoc[]> {
  const filter: Record<string, unknown> = { documentId };
  if (userId) filter.userId = userId;

  const vectorStore = await PineconeStore.fromExistingIndex(makeEmbeddings(), {
    pineconeIndex: getPineconeIndex(),
    filter,
  });

  return vectorStore.similaritySearchWithScore(query, topK);
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

export async function retrieveContextForDocumentsWithScores(
  query: string,
  documentIds: string[],
  topK = 8,
  userId?: string
): Promise<ScoredDoc[]> {
  if (documentIds.length === 1) {
    return retrieveContextWithScores(query, documentIds[0], topK, userId);
  }

  const filter: Record<string, unknown> = { documentId: { $in: documentIds } };
  if (userId) filter.userId = userId;

  const vectorStore = await PineconeStore.fromExistingIndex(makeEmbeddings(), {
    pineconeIndex: getPineconeIndex(),
    filter,
  });

  return vectorStore.similaritySearchWithScore(query, topK);
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
