create table note_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index idx_note_folders_user_id on note_folders(user_id);

alter table notes add column folder_id uuid references note_folders(id) on delete set null;

create index idx_notes_folder_id on notes(folder_id);

alter table note_folders enable row level security;

create policy "note_folders_select" on note_folders
  for select using (user_id = auth.uid());

create policy "note_folders_insert" on note_folders
  for insert with check (user_id = auth.uid());

create policy "note_folders_update" on note_folders
  for update using (user_id = auth.uid());

create policy "note_folders_delete" on note_folders
  for delete using (user_id = auth.uid());
