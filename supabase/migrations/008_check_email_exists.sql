-- Helper function used by the login API to distinguish "wrong password"
-- from "no account" without exposing the auth.users table directly.
create or replace function public.check_email_exists(email_input text)
returns boolean
language sql
security definer
set search_path = auth
as $$
  select exists(
    select 1 from auth.users where email = lower(trim(email_input))
  )
$$;

-- Only the service-role key (backend) should call this; revoke from anon/authenticated.
revoke execute on function public.check_email_exists(text) from anon, authenticated;
grant  execute on function public.check_email_exists(text) to service_role;
