-- Add user ownership to primary tables
alter table documents        add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table document_groups  add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table quiz_results     add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

-- Indexes for fast per-user lookups
create index if not exists idx_documents_user_id       on documents(user_id);
create index if not exists idx_document_groups_user_id on document_groups(user_id);
create index if not exists idx_quiz_results_user_id    on quiz_results(user_id);

-- Enable Row Level Security on every table
alter table documents        enable row level security;
alter table document_groups  enable row level security;
alter table summaries        enable row level security;
alter table flashcards       enable row level security;
alter table quizzes          enable row level security;
alter table quiz_results     enable row level security;
alter table chat_sessions    enable row level security;

-- ── documents ────────────────────────────────────────────────────────────────
create policy "documents_select" on documents
  for select using (user_id = auth.uid());

create policy "documents_insert" on documents
  for insert with check (user_id = auth.uid());

create policy "documents_update" on documents
  for update using (user_id = auth.uid());

create policy "documents_delete" on documents
  for delete using (user_id = auth.uid());

-- ── document_groups ───────────────────────────────────────────────────────────
create policy "document_groups_select" on document_groups
  for select using (user_id = auth.uid());

create policy "document_groups_insert" on document_groups
  for insert with check (user_id = auth.uid());

create policy "document_groups_update" on document_groups
  for update using (user_id = auth.uid());

create policy "document_groups_delete" on document_groups
  for delete using (user_id = auth.uid());

-- ── summaries (access via parent document or group) ───────────────────────────
create policy "summaries_select" on summaries for select using (
  (document_id is not null and document_id in (select id from documents where user_id = auth.uid()))
  or (group_id is not null and group_id in (select id from document_groups where user_id = auth.uid()))
);

create policy "summaries_insert" on summaries for insert with check (
  (document_id is not null and document_id in (select id from documents where user_id = auth.uid()))
  or (group_id is not null and group_id in (select id from document_groups where user_id = auth.uid()))
);

create policy "summaries_delete" on summaries for delete using (
  (document_id is not null and document_id in (select id from documents where user_id = auth.uid()))
  or (group_id is not null and group_id in (select id from document_groups where user_id = auth.uid()))
);

-- ── flashcards ────────────────────────────────────────────────────────────────
create policy "flashcards_select" on flashcards for select using (
  (document_id is not null and document_id in (select id from documents where user_id = auth.uid()))
  or (group_id is not null and group_id in (select id from document_groups where user_id = auth.uid()))
);

create policy "flashcards_insert" on flashcards for insert with check (
  (document_id is not null and document_id in (select id from documents where user_id = auth.uid()))
  or (group_id is not null and group_id in (select id from document_groups where user_id = auth.uid()))
);

create policy "flashcards_delete" on flashcards for delete using (
  (document_id is not null and document_id in (select id from documents where user_id = auth.uid()))
  or (group_id is not null and group_id in (select id from document_groups where user_id = auth.uid()))
);

-- ── quizzes ───────────────────────────────────────────────────────────────────
create policy "quizzes_select" on quizzes for select using (
  (document_id is not null and document_id in (select id from documents where user_id = auth.uid()))
  or (group_id is not null and group_id in (select id from document_groups where user_id = auth.uid()))
);

create policy "quizzes_insert" on quizzes for insert with check (
  (document_id is not null and document_id in (select id from documents where user_id = auth.uid()))
  or (group_id is not null and group_id in (select id from document_groups where user_id = auth.uid()))
);

create policy "quizzes_delete" on quizzes for delete using (
  (document_id is not null and document_id in (select id from documents where user_id = auth.uid()))
  or (group_id is not null and group_id in (select id from document_groups where user_id = auth.uid()))
);

-- ── quiz_results (user_id column, direct ownership) ───────────────────────────
create policy "quiz_results_select" on quiz_results
  for select using (user_id = auth.uid());

create policy "quiz_results_insert" on quiz_results
  for insert with check (user_id = auth.uid());

-- ── chat_sessions ─────────────────────────────────────────────────────────────
create policy "chat_sessions_select" on chat_sessions for select using (
  (document_id is not null and document_id in (select id from documents where user_id = auth.uid()))
  or (group_id is not null and group_id in (select id from document_groups where user_id = auth.uid()))
);

create policy "chat_sessions_insert" on chat_sessions for insert with check (
  (document_id is not null and document_id in (select id from documents where user_id = auth.uid()))
  or (group_id is not null and group_id in (select id from document_groups where user_id = auth.uid()))
);

create policy "chat_sessions_update" on chat_sessions for update using (
  (document_id is not null and document_id in (select id from documents where user_id = auth.uid()))
  or (group_id is not null and group_id in (select id from document_groups where user_id = auth.uid()))
);
