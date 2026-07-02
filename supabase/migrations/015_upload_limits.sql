-- Monthly upload limits and admin overrides

alter table profiles
  add column if not exists timezone text not null default 'UTC',
  add column if not exists upload_limit_override integer,
  add column if not exists upload_unlimited boolean not null default false;

-- Migrate legacy upload_usage table (period_start) from earlier schema attempts
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'upload_usage'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'upload_usage'
      and column_name = 'period_start'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'upload_usage'
      and column_name = 'period_key'
  ) then
    alter table upload_usage add column period_key text;
    update upload_usage
      set period_key = to_char(period_start, 'YYYY-MM')
      where period_key is null;
    alter table upload_usage alter column period_key set not null;
    alter table upload_usage drop constraint if exists upload_usage_pkey;
    alter table upload_usage drop column period_start;
    alter table upload_usage add primary key (user_id, period_key);
  end if;
end $$;

create table if not exists upload_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_key text not null,
  upload_count integer not null default 0 check (upload_count >= 0),
  primary key (user_id, period_key)
);

-- Ensure period_key exists if table was created without it (partial failed run)
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'upload_usage'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'upload_usage'
      and column_name = 'period_key'
  ) then
    alter table upload_usage add column period_key text;
    update upload_usage
      set period_key = to_char(now() at time zone 'UTC', 'YYYY-MM')
      where period_key is null;
    alter table upload_usage alter column period_key set not null;
    alter table upload_usage drop constraint if exists upload_usage_pkey;
    alter table upload_usage add primary key (user_id, period_key);
  end if;
end $$;

drop index if exists idx_upload_usage_user_period;

create index if not exists idx_upload_usage_user_period on upload_usage(user_id, period_key);

create table if not exists upload_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_key text not null,
  file_count integer not null check (file_count > 0),
  consumed_count integer not null default 0 check (consumed_count >= 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_upload_reservations_user on upload_reservations(user_id);
create index if not exists idx_upload_reservations_expires on upload_reservations(expires_at);

-- Backfill current-month usage from existing documents (UTC fallback until timezone is synced)
insert into upload_usage (user_id, period_key, upload_count)
select
  d.user_id,
  to_char(now() at time zone 'UTC', 'YYYY-MM'),
  count(*)::integer
from documents d
where d.user_id is not null
  and date_trunc('month', d.created_at at time zone 'UTC')
    = date_trunc('month', now() at time zone 'UTC')
group by d.user_id
on conflict (user_id, period_key) do update
  set upload_count = excluded.upload_count;

create or replace function period_key_for_timezone(p_timezone text)
returns text
language plpgsql
stable
as $$
declare
  tz text := coalesce(nullif(trim(p_timezone), ''), 'UTC');
begin
  return to_char(now() at time zone tz, 'YYYY-MM');
exception
  when invalid_parameter_value then
    return to_char(now() at time zone 'UTC', 'YYYY-MM');
end;
$$;

create or replace function effective_upload_limit(
  p_upload_unlimited boolean,
  p_upload_limit_override integer
)
returns integer
language plpgsql
immutable
as $$
begin
  if p_upload_unlimited then
    return null;
  end if;
  if p_upload_limit_override is not null then
    return p_upload_limit_override;
  end if;
  return 15;
end;
$$;

create or replace function reserve_uploads(p_user_id uuid, p_count integer)
returns uuid
language plpgsql
as $$
declare
  v_timezone text;
  v_upload_unlimited boolean;
  v_upload_limit_override integer;
  v_period_key text;
  v_limit integer;
  v_current_count integer;
  v_reservation_id uuid;
begin
  if p_count is null or p_count <= 0 then
    raise exception 'INVALID_COUNT';
  end if;

  select timezone, upload_unlimited, upload_limit_override
  into v_timezone, v_upload_unlimited, v_upload_limit_override
  from profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  v_period_key := period_key_for_timezone(v_timezone);
  v_limit := effective_upload_limit(v_upload_unlimited, v_upload_limit_override);

  insert into upload_usage (user_id, period_key, upload_count)
  values (p_user_id, v_period_key, 0)
  on conflict (user_id, period_key) do nothing;

  select upload_count
  into v_current_count
  from upload_usage
  where user_id = p_user_id and period_key = v_period_key
  for update;

  if v_limit is not null and v_current_count + p_count > v_limit then
    raise exception 'UPLOAD_LIMIT_EXCEEDED';
  end if;

  update upload_usage
  set upload_count = upload_count + p_count
  where user_id = p_user_id and period_key = v_period_key;

  insert into upload_reservations (
    user_id,
    period_key,
    file_count,
    expires_at
  )
  values (
    p_user_id,
    v_period_key,
    p_count,
    now() + interval '30 minutes'
  )
  returning id into v_reservation_id;

  return v_reservation_id;
end;
$$;

create or replace function consume_upload_reservation(
  p_reservation_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
as $$
declare
  v_consumed integer;
  v_file_count integer;
begin
  select consumed_count, file_count
  into v_consumed, v_file_count
  from upload_reservations
  where id = p_reservation_id
    and user_id = p_user_id
    and expires_at > now()
  for update;

  if not found then
    return false;
  end if;

  if v_consumed >= v_file_count then
    return false;
  end if;

  update upload_reservations
  set consumed_count = consumed_count + 1
  where id = p_reservation_id;

  return true;
end;
$$;
