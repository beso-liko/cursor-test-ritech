-- Migrate chat_usage from the old per-document/group schema to the current
-- per-user monthly schema, deduplicate rows, and ensure the primary key exists.
--
-- Run this if you previously applied an older chat_limits migration that created
-- chat_usage with document_id / group_id columns.

-- 1) Rebuild table when the legacy columns still exist.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'chat_usage'
      and column_name = 'document_id'
  ) then
    create table chat_usage_migrated (
      user_id uuid not null references auth.users(id) on delete cascade,
      period_key text not null,
      response_count integer not null default 0 check (response_count >= 0),
      primary key (user_id, period_key)
    );

    insert into chat_usage_migrated (user_id, period_key, response_count)
    select user_id, period_key, sum(response_count)::integer
    from chat_usage
    group by user_id, period_key;

    drop table chat_usage;
    alter table chat_usage_migrated rename to chat_usage;
  end if;
end $$;

-- 2) Collapse any remaining duplicate (user_id, period_key) rows.
create temp table chat_usage_deduped on commit drop as
select user_id, period_key, sum(response_count)::integer as response_count
from chat_usage
group by user_id, period_key;

delete from chat_usage;

insert into chat_usage (user_id, period_key, response_count)
select user_id, period_key, response_count
from chat_usage_deduped;

-- 3) Ensure primary key exists (safe if 017 already ran).
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.chat_usage'::regclass
      and contype = 'p'
  ) then
    alter table public.chat_usage
      add constraint chat_usage_pkey primary key (user_id, period_key);
  end if;
exception
  when duplicate_object then null;
end;
$$;

create index if not exists idx_chat_usage_user_period
  on chat_usage (user_id, period_key);

-- 4) Keep consume_chat_response aligned with the simplified schema.
create or replace function consume_chat_response(p_user_id uuid)
returns boolean
language plpgsql
as $$
declare
  v_timezone text;
  v_chat_unlimited boolean;
  v_chat_limit_override integer;
  v_period_key text;
  v_limit integer;
  v_current_count integer;
begin
  select timezone, chat_unlimited, chat_limit_override
  into v_timezone, v_chat_unlimited, v_chat_limit_override
  from profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  v_period_key := period_key_for_timezone(v_timezone);
  v_limit := effective_chat_limit(v_chat_unlimited, v_chat_limit_override);

  insert into chat_usage (user_id, period_key, response_count)
  values (p_user_id, v_period_key, 0)
  on conflict (user_id, period_key) do nothing;

  select response_count
  into v_current_count
  from chat_usage
  where user_id = p_user_id and period_key = v_period_key
  for update;

  if v_limit is not null and v_current_count + 1 > v_limit then
    raise exception 'CHAT_LIMIT_EXCEEDED';
  end if;

  update chat_usage
  set response_count = response_count + 1
  where user_id = p_user_id and period_key = v_period_key;

  return true;
end;
$$;
