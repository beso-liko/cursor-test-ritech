-- Monthly chat response limits per document/group and admin overrides

alter table profiles
  add column if not exists chat_limit_override integer,
  add column if not exists chat_unlimited boolean not null default false;

create table if not exists chat_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  period_key text not null,
  document_id uuid references documents(id) on delete cascade,
  group_id uuid references document_groups(id) on delete cascade,
  response_count integer not null default 0 check (response_count >= 0),
  constraint chat_usage_one_target check (
    (document_id is not null and group_id is null)
    or (document_id is null and group_id is not null)
  )
);

create unique index if not exists chat_usage_document_unique
  on chat_usage (user_id, period_key, document_id)
  where document_id is not null;

create unique index if not exists chat_usage_group_unique
  on chat_usage (user_id, period_key, group_id)
  where group_id is not null;

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

create or replace function consume_chat_response(
  p_user_id uuid,
  p_document_id uuid,
  p_group_id uuid
)
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
  if (p_document_id is null and p_group_id is null)
    or (p_document_id is not null and p_group_id is not null) then
    raise exception 'INVALID_TARGET';
  end if;

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

  if p_document_id is not null then
    begin
      insert into chat_usage (user_id, period_key, document_id, group_id, response_count)
      values (p_user_id, v_period_key, p_document_id, null, 0);
    exception
      when unique_violation then
        null;
    end;

    select response_count
    into v_current_count
    from chat_usage
    where user_id = p_user_id
      and period_key = v_period_key
      and document_id = p_document_id
    for update;
  else
    begin
      insert into chat_usage (user_id, period_key, document_id, group_id, response_count)
      values (p_user_id, v_period_key, null, p_group_id, 0);
    exception
      when unique_violation then
        null;
    end;

    select response_count
    into v_current_count
    from chat_usage
    where user_id = p_user_id
      and period_key = v_period_key
      and group_id = p_group_id
    for update;
  end if;

  if v_limit is not null and v_current_count + 1 > v_limit then
    raise exception 'CHAT_LIMIT_EXCEEDED';
  end if;

  if p_document_id is not null then
    update chat_usage
    set response_count = response_count + 1
    where user_id = p_user_id
      and period_key = v_period_key
      and document_id = p_document_id;
  else
    update chat_usage
    set response_count = response_count + 1
    where user_id = p_user_id
      and period_key = v_period_key
      and group_id = p_group_id;
  end if;

  return true;
end;
$$;
