-- Document Groups: allow multiple files to be studied together

create table if not exists document_groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamp with time zone default now()
);

-- Link individual documents to a group (nullable for single-file uploads)
alter table documents add column if not exists group_id uuid references document_groups(id) on delete set null;

-- Allow group-level AI content (group_id is the alternative to document_id)
alter table summaries    add column if not exists group_id uuid references document_groups(id) on delete cascade;
alter table flashcards   add column if not exists group_id uuid references document_groups(id) on delete cascade;
alter table quizzes      add column if not exists group_id uuid references document_groups(id) on delete cascade;
alter table chat_sessions add column if not exists group_id uuid references document_groups(id) on delete cascade;

create index if not exists idx_documents_group_id    on documents(group_id);
create index if not exists idx_summaries_group_id    on summaries(group_id);
create index if not exists idx_flashcards_group_id   on flashcards(group_id);
create index if not exists idx_quizzes_group_id      on quizzes(group_id);
create index if not exists idx_chat_sessions_group_id on chat_sessions(group_id);
