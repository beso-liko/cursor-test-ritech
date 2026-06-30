create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled',
  content jsonb not null default '{}',
  drawing_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_notes_user_id on notes(user_id);

alter table notes enable row level security;

create policy "notes_select" on notes
  for select using (user_id = auth.uid());

create policy "notes_insert" on notes
  for insert with check (user_id = auth.uid());

create policy "notes_update" on notes
  for update using (user_id = auth.uid());

create policy "notes_delete" on notes
  for delete using (user_id = auth.uid());
