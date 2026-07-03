-- Fix chat_usage primary key (may be missing if 016 ran against a pre-existing table)
-- and make consume_chat_response resilient without ON CONFLICT.

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
  when duplicate_table then null;
  when duplicate_object then null;
end;
$$;

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

  if not exists (
    select 1
    from chat_usage
    where user_id = p_user_id and period_key = v_period_key
  ) then
    insert into chat_usage (user_id, period_key, response_count)
    values (p_user_id, v_period_key, 0);
  end if;

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
