-- Link Clerk accounts to existing Supabase auth users (preserves document ownership)
alter table profiles add column if not exists clerk_id text unique;

create index if not exists idx_profiles_clerk_id on profiles(clerk_id);
