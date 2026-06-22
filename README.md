# StudyAI — AI Study Assistant

Upload your study documents and let AI generate summaries, flashcards, quizzes, and answer your questions via RAG-powered chat.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript + Tailwind CSS + shadcn/ui**
- **Supabase** — PostgreSQL database + file storage
- **Pinecone** — vector store for RAG
- **OpenAI** — gpt-4o-mini (LLM) + text-embedding-3-small (embeddings)
- **LangChain** — text splitting, embedding pipeline, RAG retrieval
- **Vercel AI SDK** — streaming chat

---

## 1. Prerequisites

Create free accounts on:

| Service   | URL                              | What you need                             |
|-----------|----------------------------------|-------------------------------------------|
| Supabase  | https://supabase.com             | Project URL, Anon Key, Service Role Key   |
| OpenAI    | https://platform.openai.com      | API Key                                   |
| Pinecone  | https://app.pinecone.io          | API Key + create an index (see below)     |

---

## 2. Supabase Setup

### Database tables

Run this SQL in your Supabase SQL editor (Dashboard → SQL Editor):

```sql
-- paste contents of supabase/migrations/001_initial.sql
```

Or just copy-paste the file `supabase/migrations/001_initial.sql`.

### Storage bucket

1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**, name it `documents`
3. Set it as **Private**
4. Add the following RLS policy to allow all operations (personal use):

```sql
create policy "Allow all operations"
on storage.objects for all
using ( bucket_id = 'documents' )
with check ( bucket_id = 'documents' );
```

---

## 3. Pinecone Setup

1. Go to https://app.pinecone.io → **Create Index**
2. Name: `study-assistant` (or any name — update `PINECONE_INDEX_NAME` accordingly)
3. Dimensions: **1024** (text-embedding-3-small supports truncated 1024-dim vectors)
4. Metric: **cosine**
5. Cloud: **AWS / us-east-1** (free tier)

---

## 4. Environment Variables

```bash
cp .env.local.example .env.local
# then fill in your values
```

Required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
PINECONE_API_KEY=
PINECONE_INDEX_NAME=study-assistant
```

---

## 5. Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

---

## 6. Deploy to Vercel

```bash
npx vercel
# set all env vars in Vercel dashboard → Settings → Environment Variables
```

---

## Features

| Feature          | Description                                                       |
|------------------|-------------------------------------------------------------------|
| File upload      | PDF, DOCX, PPTX, TXT up to 20MB via Supabase Storage             |
| Processing       | Text extraction → chunking (1000 tokens) → embedding → Pinecone  |
| Summary          | AI-generated document summary with key points and topics         |
| Flashcards       | 10-15 flip-card flashcards with Q&A                              |
| Quiz             | 10-question multiple choice quiz with scoring and explanations   |
| Chat             | RAG-powered chat — answers grounded in your document             |
| Caching          | Generated content cached in Supabase (never regenerated)         |

---

## Cost Estimate (personal use)

| Service     | Cost               |
|-------------|--------------------|
| Vercel      | Free (Hobby)       |
| Supabase    | Free tier          |
| Pinecone    | Free tier          |
| OpenAI      | ~$0.001 per doc    |
| **Monthly** | **< $1**           |
