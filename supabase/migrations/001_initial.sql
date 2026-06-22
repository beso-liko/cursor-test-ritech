-- AI Study Assistant - Initial Schema

create table if not exists documents (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  file_url text,
  file_type text not null,
  page_count integer,
  status text not null default 'processing',
  chunk_count integer default 0,
  created_at timestamp with time zone default now()
);

create table if not exists summaries (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references documents(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default now()
);

create table if not exists flashcards (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references documents(id) on delete cascade not null,
  question text not null,
  answer text not null,
  created_at timestamp with time zone default now()
);

create table if not exists quizzes (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references documents(id) on delete cascade not null,
  questions jsonb not null default '[]',
  created_at timestamp with time zone default now()
);

create table if not exists quiz_results (
  id uuid default gen_random_uuid() primary key,
  quiz_id uuid references quizzes(id) on delete cascade not null,
  score integer not null,
  total integer not null,
  answers jsonb not null default '[]',
  taken_at timestamp with time zone default now()
);

create table if not exists chat_sessions (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references documents(id) on delete cascade not null unique,
  messages jsonb not null default '[]',
  updated_at timestamp with time zone default now()
);

-- Indexes for faster lookups
create index if not exists idx_summaries_document_id on summaries(document_id);
create index if not exists idx_flashcards_document_id on flashcards(document_id);
create index if not exists idx_quizzes_document_id on quizzes(document_id);
create index if not exists idx_quiz_results_quiz_id on quiz_results(quiz_id);
create index if not exists idx_chat_sessions_document_id on chat_sessions(document_id);
create index if not exists idx_documents_created_at on documents(created_at desc);
