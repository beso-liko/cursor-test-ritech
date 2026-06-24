-- User profile table for optional display name
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  first_name  text,
  last_name   text,
  updated_at  timestamptz default now()
);

-- Index for fast lookup (PK is already indexed, but make intent explicit)
create index if not exists idx_profiles_id on profiles(id);

-- Enable Row Level Security
alter table profiles enable row level security;

-- Users can only read their own profile
create policy "profiles_select" on profiles
  for select using (id = auth.uid());

-- Users can insert their own profile
create policy "profiles_insert" on profiles
  for insert with check (id = auth.uid());

-- Users can update their own profile
create policy "profiles_update" on profiles
  for update using (id = auth.uid());

-- Users can delete their own profile (handled by cascade, but explicit is fine)
create policy "profiles_delete" on profiles
  for delete using (id = auth.uid());
