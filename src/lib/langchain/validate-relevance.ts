import {
  isBroadDocumentQuestion,
  retrieveChatContext,
  retrieveChatContextForDocuments,
  retrieveFocusScores,
} from "@/lib/langchain/rag-chain";

export const RELEVANCE_THRESHOLD = 0.15;

/** Fewer chunks — we only need a similarity score, not full context. */
const FOCUS_CHECK_TOP_K = 3;
/** More chunks when focus is valid and we need generation context. */
const FOCUS_CONTEXT_TOP_K = 8;

type ScoredDoc = [{ pageContent: string; metadata: Record<string, unknown> }, number];

export async function retrieveRelevantContext(
  query: string,
  opts: { documentId?: string; documentIds?: string[]; userId: string }
): Promise<ScoredDoc[]> {
  if (opts.documentIds && opts.documentIds.length > 0) {
    return retrieveChatContextForDocuments(query, opts.documentIds, opts.userId);
  }
  if (opts.documentId) {
    return retrieveChatContext(query, opts.documentId, opts.userId);
  }
  return [];
}

function maxSimilarityScore(docsWithScores: ScoredDoc[]): number {
  if (docsWithScores.length === 0) return 0;
  return Math.max(...docsWithScores.map(([, score]) => score));
}

function joinContext(docsWithScores: ScoredDoc[]): string {
  return docsWithScores.map(([doc]) => doc.pageContent).join("\n\n---\n\n");
}

export async function validateQueryRelevance(
  query: string,
  opts: { documentId?: string; documentIds?: string[]; userId: string }
): Promise<
  { valid: true; context: string } | { valid: false; error: "off_topic" }
> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { valid: false, error: "off_topic" };
  }

  const docsWithScores = await retrieveRelevantContext(trimmed, opts);

  if (docsWithScores.length === 0) {
    return { valid: false, error: "off_topic" };
  }

  const maxScore = maxSimilarityScore(docsWithScores);
  const isBroadQuestion = isBroadDocumentQuestion(trimmed);

  if (!isBroadQuestion && maxScore < RELEVANCE_THRESHOLD) {
    return { valid: false, error: "off_topic" };
  }

  return { valid: true, context: joinContext(docsWithScores) };
}

/**
 * Fast relevance check for the focus dialog — single Pinecone query, no broad fallback.
 */
export async function checkFocusRelevance(
  focus: string,
  opts: { documentId?: string; documentIds?: string[]; userId: string }
): Promise<{ valid: true } | { valid: false; error: "off_topic" }> {
  const trimmed = focus.trim();
  if (!trimmed) {
    return { valid: false, error: "off_topic" };
  }

  const docsWithScores = await retrieveFocusScores(trimmed, opts, FOCUS_CHECK_TOP_K);

  if (docsWithScores.length === 0) {
    return { valid: false, error: "off_topic" };
  }

  if (maxSimilarityScore(docsWithScores) < RELEVANCE_THRESHOLD) {
    return { valid: false, error: "off_topic" };
  }

  return { valid: true };
}

/**
 * Validates a generation focus topic against document content.
 * Uses the same Pinecone similarity threshold as chat (RELEVANCE_THRESHOLD)
 * but a single direct query — no chat broad-query fallback (which doubled latency on reject).
 */
export async function validateFocusRelevance(
  focus: string,
  opts: { documentId?: string; documentIds?: string[]; userId: string }
): Promise<
  { valid: true; context: string } | { valid: false; error: "off_topic" }
> {
  const trimmed = focus.trim();
  if (!trimmed) {
    return { valid: false, error: "off_topic" };
  }

  const docsWithScores = await retrieveFocusScores(trimmed, opts, FOCUS_CONTEXT_TOP_K);

  if (docsWithScores.length === 0) {
    return { valid: false, error: "off_topic" };
  }

  if (maxSimilarityScore(docsWithScores) < RELEVANCE_THRESHOLD) {
    return { valid: false, error: "off_topic" };
  }

  return { valid: true, context: joinContext(docsWithScores) };
}
