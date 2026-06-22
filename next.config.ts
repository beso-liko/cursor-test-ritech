import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  serverExternalPackages: [
    "pdf-parse",
    "canvas",
    "@napi-rs/canvas",
    "officeparser",
    "mammoth",
    "openai",
    "@langchain/openai",
    "@langchain/pinecone",
    "@pinecone-database/pinecone",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;