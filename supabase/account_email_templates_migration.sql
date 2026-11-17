-- Account emails from the email builder (run after security_email_dedupe_migration.sql).
--
-- 1. campaigns.system_key marks an email builder template as the one sent
--    for an account email: unlock_link, password_changed, account_activated,
--    signup_approved. campaigns.email_html keeps its rendered HTML (tokens
--    left in), saved by the builder, because the server that sends it can't
--    run the builder's renderer. api/_lib/securityEmails.js fills the tokens;
--    with no template it sends its built-in email. The four templates are
--    seeded by scripts/seed.js (Settings → Content → Emails, category
--    "Account Security").
-- 2. A new password set after an administrator's unlock now sends
--    "account_activated" instead of "password_changed". The payload also
--    carries the email, for the {{user_id}} token.
-- 3. Approving a Pending sign-up (Settings → Users) queues "signup_approved".
--
-- Run: supabase db query --linked --file supabase/account_email_templates_migration.sql

begin;

-- ── Template columns ────────────────────────────────────────────────────────
alter table public.campaigns add column if not exists system_key text;
alter table public.campaigns add column if not exists email_html text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'campaigns_system_key_key') then
    alter table public.campaigns add constraint campaigns_system_key_key unique (system_key);
  end if;
end $$;

-- ── Password set vs account activated ───────────────────────────────────────
-- As in security_email_dedupe_migration.sql, except the email kind and payload.
create or replace function public.on_auth_password_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  was_locked boolean := false;
  was_waiting boolean := false;
  is_invite boolean := coalesce(old.raw_user_meta_data->>'invited', '') = 'true';
  display text;
  account_status text;
begin
  if new.encrypted_password is not distinct from old.encrypted_password then
    return new;
  end if;
  if is_invite then
    return new;
  end if;

  if coalesce(old.encrypted_password, '') <> '' then
    insert into public.password_history (user_id, password_hash) values (new.id, old.encrypted_password);
    delete from public.password_history
     where user_id = new.id
       and id not in (select id from public.password_history where user_id = new.id order by created_at desc limit 5);
  end if;

  select locked_at is not null, require_reset into was_locked, was_waiting
    from public.account_lockouts where user_id = new.id;
  update public.account_lockouts
     set failed_count = 0, first_failed_at = null, failed_apps = '{}', require_reset = false,
         locked_at = null, updated_at = now()
   where user_id = new.id;

  insert into public.account_lock_events (user_id, event, actor_name, detail)
  values (new.id, 'password_changed', 'user', jsonb_build_object('was_locked', coalesce(was_locked, false)));

  delete from auth.sessions where user_id = new.id;

  select coalesce(nullif(trim(full_name), ''), new.email), status into display, account_status
    from public.profiles where id = new.id;
  perform public.account_security_audit(new.id, 'Password changed',
    case when coalesce(was_waiting, false) then 'New password set after an administrator unlocked the account. Signed out of all sessions.'
         else 'Password changed. Signed out of all sessions.' end,
    coalesce(display, new.email));

  if account_status is distinct from 'Pending' then
    insert into public.security_email_outbox (kind, user_id, to_email, payload)
    values (case when coalesce(was_waiting, false) then 'account_activated' else 'password_changed' end,
            new.id, new.email,
            jsonb_build_object('name', coalesce(display, new.email), 'email', new.email, 'at', now()));
    perform public.security_email_kick();
  end if;
  return new;
exception when others then
  raise warning 'password change bookkeeping skipped: %', sqlerrm;
  return new;
end;
$$;
revoke execute on function public.on_auth_password_changed() from public, anon, authenticated;

-- ── Sign-up approved ────────────────────────────────────────────────────────
create or replace function public.on_profile_signup_approved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'Pending' and new.status = 'Active' and new.email is not null then
    insert into public.security_email_outbox (kind, user_id, to_email, payload)
    values ('signup_approved', new.id, new.email,
            jsonb_build_object('name', coalesce(nullif(trim(new.full_name), ''), new.email), 'email', new.email, 'at', now()));
    perform public.account_security_audit(new.id, 'Sign-up approved', 'Access approved. Emailed the user that they can sign in.',
      coalesce((select nullif(trim(full_name), '') from public.profiles where id = auth.uid()), 'System'));
    perform public.security_email_kick();
  end if;
  return new;
exception when others then
  raise warning 'sign-up approval email skipped: %', sqlerrm;
  return new;
end;
$$;
revoke execute on function public.on_profile_signup_approved() from public, anon, authenticated;

drop trigger if exists profile_signup_approved_email on public.profiles;
create trigger profile_signup_approved_email
  after update of status on public.profiles
  for each row execute function public.on_profile_signup_approved();

commit;

-- ── Rollback ────────────────────────────────────────────────────────────────
--   drop trigger if exists profile_signup_approved_email on public.profiles;
--   drop function if exists public.on_profile_signup_approved();
--   Re-run the on_auth_password_changed block from security_email_dedupe_migration.sql.
--   alter table public.campaigns drop constraint if exists campaigns_system_key_key;
--   alter table public.campaigns drop column if exists email_html, drop column if exists system_key;
