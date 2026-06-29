-- Store email on profiles for reliable legacy account matching after Clerk migration.
alter table profiles add column if not exists email text;

create index if not exists idx_profiles_email on profiles (lower(email));

update profiles p
set email = lower(u.email)
from auth.users u
where p.id = u.id
  and u.email is not null
  and (p.email is null or p.email = '');
