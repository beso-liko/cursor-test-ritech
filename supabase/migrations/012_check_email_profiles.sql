-- Match legacy accounts by profile email as well as auth.users email.
create or replace function public.check_email_exists(email_input text)
returns boolean
language sql
security definer
set search_path = auth, public
as $$
  select exists(
    select 1 from auth.users where email = lower(trim(email_input))
  )
  or exists(
    select 1 from public.profiles where lower(email) = lower(trim(email_input))
  );
$$;

revoke execute on function public.check_email_exists(text) from anon, authenticated;
grant execute on function public.check_email_exists(text) to service_role;
