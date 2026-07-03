-- Monthly chat response limits and admin overrides

alter table profiles
  add column if not exists chat_limit_override integer,
  add column if not exists chat_unlimited boolean not null default false;

create table if not exists chat_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_key text not null,
  response_count integer not null default 0 check (response_count >= 0),
  primary key (user_id, period_key)
);

create index if not exists idx_chat_usage_user_period
  on chat_usage (user_id, period_key);

create or replace function effective_chat_limit(
  p_chat_unlimited boolean,
  p_chat_limit_override integer
)
returns integer
language plpgsql
immutable
as $$
begin
  if p_chat_unlimited then
    return null;
  end if;
  if p_chat_limit_override is not null then
    return p_chat_limit_override;
  end if;
  return 20;
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
