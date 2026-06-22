import { Pinecone } from "@pinecone-database/pinecone";

let pineconeInstance: Pinecone | null = null;

function getPineconeClient(): Pinecone {
  if (!pineconeInstance) {
    pineconeInstance = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pineconeInstance;
}

export function getPineconeIndex() {
  return getPineconeClient().index(process.env.PINECONE_INDEX_NAME!);
}
