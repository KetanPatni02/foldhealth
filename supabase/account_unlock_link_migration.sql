-- Account lockout, part 2 (run after account_lockout_migration.sql).
--
-- 1. Works on the Supabase free plan; the paid Password Verification Hook is
--    optional. The access-token hook (already enabled for sign-up approval)
--    refuses password sign-ins while an account is locked or waiting for a
--    new password. The sign-in page reports each failure through
--    record_sign_in_failure(email, password), which counts it only after
--    checking that the password really is wrong for that account, so a
--    caller can't lock someone out without actually guessing wrong. (It's
--    skipped when the hook already counted that attempt.) Guesses sent
--    straight to the Auth API, bypassing the app, aren't counted; Supabase's
--    own per-IP rate limit covers those.
-- 2. Unlocking is administrator-only: a locked user asks with
--    request_account_unlock(); an admin unlocks (api/_handlers/account-unlock.js),
--    which emails the user their User ID and a one-time link (24 hours) to
--    set a new password. Until they do, password sign-in stays refused.
-- 3. Every step is written to audit_logs (entity UserProfile), which the
--    user's profile shows under Audit Log: each failed attempt, the lock,
--    the request, the unlock and its reason, the link and the new password.

begin;

-- ── Audit helper ────────────────────────────────────────────────────────────
create or replace function public.account_security_audit(target uuid, act text, detail text, actor text default 'System')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  display text;
begin
  select coalesce(nullif(trim(p.full_name), ''), u.email) into display
    from auth.users u left join public.profiles p on p.id = u.id where u.id = target;
  insert into public.audit_logs (entity_type, entity_id, entity_name, action, user_name, details, category)
  values ('UserProfile', target::text, coalesce(display, target::text), act, coalesce(actor, 'System'), detail, 'Security');
exception when others then
  raise warning 'security audit skipped: %', sqlerrm;
end;
$$;
revoke execute on function public.account_security_audit(uuid, text, text, text) from public, anon, authenticated;

-- ── Lock state additions ────────────────────────────────────────────────────
alter table public.account_lockouts add column if not exists last_hook_failure_at timestamptz;

-- The access-token hook runs as supabase_auth_admin and reads the lock.
grant select on table public.account_lockouts to supabase_auth_admin;
drop policy if exists "Auth admin reads account lockouts" on public.account_lockouts;
create policy "Auth admin reads account lockouts" on public.account_lockouts
  for select to supabase_auth_admin using (true);

create table if not exists public.account_unlock_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_by  uuid,
  created_at  timestamptz not null default now()
);
create index if not exists account_unlock_tokens_user_idx on public.account_unlock_tokens (user_id, created_at desc);
alter table public.account_unlock_tokens enable row level security;
-- No policies: only the service role (api/_handlers/account-unlock.js) reaches it.

-- ── One failed attempt (shared by the hook and the sign-in page) ─────────────
-- Returns true when the account is (now) locked.
create or replace function public.account_register_failure(uid uuid, from_hook boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.account_lockouts;
  max_attempts constant int := 5;
begin
  insert into public.account_lockouts (user_id) values (uid) on conflict (user_id) do nothing;
  select * into rec from public.account_lockouts where user_id = uid for update;

  update public.account_lockouts
     set failed_count         = failed_count + 1,
         first_failed_at      = coalesce(first_failed_at, now()),
         last_failed_at       = now(),
         last_hook_failure_at = case when from_hook then now() else last_hook_failure_at end,
         failed_apps          = case when 'Web' = any(failed_apps) then failed_apps else array_append(failed_apps, 'Web') end,
         updated_at           = now()
   where user_id = uid
  returning * into rec;

  if rec.locked_at is not null then
    perform public.account_security_audit(uid, 'Failed sign-in attempt',
      'Wrong password while the account is locked (attempt ' || rec.failed_count || ', Web).');
    return true;
  end if;

  perform public.account_security_audit(uid, 'Failed sign-in attempt',
    'Wrong password, attempt ' || least(rec.failed_count, max_attempts) || ' of ' || max_attempts || ' (Web).');

  if rec.failed_count >= max_attempts then
    update public.account_lockouts
       set locked_at = now(), locked_by = 'system', require_reset = false,
           unlocked_at = null, unlocked_by = null, unlocked_by_name = null, unlock_reason = null, unlock_note = null,
           updated_at = now()
     where user_id = uid;
    insert into public.account_lock_events (user_id, event, actor_name, detail)
    values (uid, 'locked', 'system', jsonb_build_object('attempts', rec.failed_count, 'apps', rec.failed_apps));
    perform public.account_security_audit(uid, 'Account locked',
      'Locked by the system after ' || rec.failed_count || ' failed sign-in attempts in a row. Only an administrator can unlock it.');
    perform public.account_lock_alert(uid, rec.failed_count);
    return true;
  end if;
  return false;
end;
$$;
revoke execute on function public.account_register_failure(uuid, boolean) from public, anon, authenticated;

-- ── Password Verification Hook (rewritten to share the logic above) ─────────
create or replace function public.hook_password_verification_attempt(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (event->>'user_id')::uuid;
  is_valid boolean := coalesce((event->>'valid')::boolean, false);
  rec public.account_lockouts;
begin
  select * into rec from public.account_lockouts where user_id = uid;

  if rec.locked_at is not null then
    if not is_valid then perform public.account_register_failure(uid, true); end if;
    return jsonb_build_object('decision', 'reject', 'message', 'ACCOUNT_PAUSED', 'should_logout_user', false);
  end if;

  if is_valid then
    if coalesce(rec.require_reset, false) then
      return jsonb_build_object('decision', 'reject', 'message', 'PASSWORD_RESET_REQUIRED', 'should_logout_user', false);
    end if;
    if coalesce(rec.failed_count, 0) > 0 then
      update public.account_lockouts
         set failed_count = 0, first_failed_at = null, failed_apps = '{}', updated_at = now()
       where user_id = uid;
    end if;
    return jsonb_build_object('decision', 'continue');
  end if;

  if public.account_register_failure(uid, true) then
    return jsonb_build_object('decision', 'reject', 'message', 'ACCOUNT_PAUSED', 'should_logout_user', false);
  end if;
  return jsonb_build_object('decision', 'continue');
end;
$$;
grant execute on function public.hook_password_verification_attempt(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_password_verification_attempt(jsonb) from public, anon, authenticated;

-- ── Sign-in page reports (work without the Password Verification Hook) ──────
-- Anyone can call this, so it only counts a failure after checking that
-- p_password really is wrong for the account: locking someone out takes as
-- many wrong guesses as signing in would. A right password (or an empty one)
-- counts nothing. Returns nothing either way, and the same for an email with
-- no account, so the answer never reveals whether a guess or an email exists.
drop function if exists public.record_sign_in_failure(text);
create or replace function public.record_sign_in_failure(p_email text, p_password text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid;
  stored text;
begin
  if coalesce(p_password, '') = '' then return; end if;
  select id, encrypted_password into uid, stored
    from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if uid is null or coalesce(stored, '') = '' then return; end if;
  if extensions.crypt(p_password, stored) = stored then return; end if;
  -- The hook already counted this attempt.
  if exists (select 1 from public.account_lockouts
              where user_id = uid and last_hook_failure_at > now() - interval '15 seconds') then
    return;
  end if;
  perform public.account_register_failure(uid, false);
end;
$$;
revoke execute on function public.record_sign_in_failure(text, text) from public;
grant execute on function public.record_sign_in_failure(text, text) to anon, authenticated;

create or replace function public.record_sign_in_success()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.account_lockouts
     set failed_count = 0, first_failed_at = null, failed_apps = '{}', updated_at = now()
   where user_id = auth.uid() and locked_at is null and failed_count > 0;
end;
$$;
revoke execute on function public.record_sign_in_success() from public, anon;
grant execute on function public.record_sign_in_success() to authenticated;

-- ── Ask an administrator to unlock ──────────────────────────────────────────
-- Notifies practice admins (in-app and email). At most once every 15
-- minutes per account. Same answer whether or not the email has an account.
create or replace function public.request_account_unlock(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  target_email text;
  display text;
  rec public.account_lockouts;
begin
  select u.id, u.email, coalesce(nullif(trim(p.full_name), ''), u.email)
    into uid, target_email, display
    from auth.users u left join public.profiles p on p.id = u.id
   where lower(u.email) = lower(trim(p_email)) limit 1;
  if uid is null then return; end if;
  select * into rec from public.account_lockouts where user_id = uid;
  if rec.user_id is null or (rec.locked_at is null and not rec.require_reset) then return; end if;
  if exists (select 1 from public.account_lock_events
              where user_id = uid and event = 'unlock_requested' and created_at > now() - interval '15 minutes') then
    return;
  end if;

  insert into public.account_lock_events (user_id, event, actor_id, actor_name)
  values (uid, 'unlock_requested', uid, display);
  perform public.account_security_audit(uid, 'Unlock requested',
    'Asked an administrator to unlock the account from the sign-in screen.', display);

  insert into public.notifications (recipient_id, actor_id, actor_name, type, title, body, action)
  select a.id, uid, display, 'user.unlock_requested', 'Unlock requested',
         display || ' asked an administrator to unlock their account.', 'openLockedUsers'
    from public.profiles a
   where a.status = 'Active' and a.id <> uid
     and (a.admin_role in ('Admin/Practice Manager', 'Business/Practice Owner')
          or 'Admin/Practice Manager' = any(coalesce(a.clinical_roles, '{}')));

  insert into public.security_email_outbox (kind, user_id, to_email, payload)
  select 'unlock_requested', uid, a.email,
         jsonb_build_object('name', display, 'email', target_email, 'at', now())
    from public.profiles a
   where a.status = 'Active' and a.id <> uid and a.email is not null
     and (a.admin_role in ('Admin/Practice Manager', 'Business/Practice Owner')
          or 'Admin/Practice Manager' = any(coalesce(a.clinical_roles, '{}')));
  perform public.security_email_kick();
end;
$$;
revoke execute on function public.request_account_unlock(text) from public;
grant execute on function public.request_account_unlock(text) to anon, authenticated;

-- ── Admin unlock: always ends in a new password ─────────────────────────────
-- Same signature as before; `require_reset` is now always on, because the
-- user comes back in through the emailed link (api/_handlers/account-unlock.js sends
-- it right after this call).
create or replace function public.admin_unlock_account(
  target uuid,
  reason text,
  note text default null,
  identity_confirmed boolean default false,
  require_reset boolean default true
)
returns public.account_lockouts
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  caller_name text;
  result public.account_lockouts;
begin
  if caller is null or not public.is_profile_admin(caller) then
    raise exception 'Only practice admins can unlock accounts' using errcode = '42501';
  end if;
  if reason not in ('phone', 'in_person', 'suspected_attack', 'other') then
    raise exception 'Choose a reason for unlocking' using errcode = '22023';
  end if;
  if not coalesce(identity_confirmed, false) then
    raise exception 'Confirm that you checked the user''s identity' using errcode = '22023';
  end if;
  if reason = 'other' and coalesce(trim(note), '') = '' then
    raise exception 'Add a note for "Other"' using errcode = '22023';
  end if;

  select coalesce(nullif(trim(full_name), ''), email) into caller_name from public.profiles where id = caller;

  insert into public.account_lockouts (user_id) values (target) on conflict (user_id) do nothing;
  update public.account_lockouts
     set locked_at = null, failed_count = 0, first_failed_at = null, failed_apps = '{}',
         require_reset = true,
         unlocked_at = now(), unlocked_by = caller, unlocked_by_name = caller_name,
         unlock_reason = reason, unlock_note = nullif(trim(note), ''),
         updated_at = now()
   where user_id = target
  returning * into result;

  -- The old password no longer opens the account; end its sessions.
  delete from auth.sessions where user_id = target;

  insert into public.account_lock_events (user_id, event, actor_id, actor_name, reason, note, detail)
  values (target, 'unlocked', caller, caller_name, reason, nullif(trim(note), ''), jsonb_build_object('require_reset', true));
  perform public.account_security_audit(target, 'Account unlocked',
    'Reason: ' || case reason when 'phone' then 'Verified by phone' when 'in_person' then 'Verified in person'
                              when 'suspected_attack' then 'Suspected attack' else 'Other' end
      || coalesce(' (' || nullif(trim(note), '') || ')', '')
      || '. Identity checked. The user must set a new password from the emailed link.',
    caller_name);

  return result;
end;
$$;
revoke execute on function public.admin_unlock_account(uuid, text, text, boolean, boolean) from public, anon;
grant execute on function public.admin_unlock_account(uuid, text, text, boolean, boolean) to authenticated;

-- ── Password changed: add the audit line ────────────────────────────────────
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

  select coalesce(nullif(trim(full_name), ''), new.email) into display from public.profiles where id = new.id;
  perform public.account_security_audit(new.id, 'Password changed',
    case when coalesce(was_waiting, false) then 'New password set after an administrator unlocked the account. Signed out of all sessions.'
         else 'Password changed. Signed out of all sessions.' end,
    coalesce(display, new.email));

  insert into public.security_email_outbox (kind, user_id, to_email, payload)
  values ('password_changed', new.id, new.email, jsonb_build_object('name', coalesce(display, new.email), 'at', now()));
  perform public.security_email_kick();
  return new;
exception when others then
  raise warning 'password change bookkeeping skipped: %', sqlerrm;
  return new;
end;
$$;
revoke execute on function public.on_auth_password_changed() from public, anon, authenticated;

-- ── Access-token hook: refuse password sign-in while locked ─────────────────
-- Everything else is as in signup_confirmation_hook_fix_migration.sql.
-- Token refresh is untouched, so sessions already signed in keep working.
create or replace function public.signup_approval_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  account_status text;
  is_locked boolean := false;
  needs_reset boolean := false;
begin
  select status into account_status
    from public.profiles
   where id = (event->>'user_id')::uuid;

  if account_status = 'Pending' then
    if event->>'authentication_method' in ('email/signup', 'otp', 'magiclink', 'oauth') then
      return jsonb_set(
        event,
        '{claims}',
        (event->'claims') || jsonb_build_object('role', 'anon', 'approval_status', 'pending')
      );
    end if;
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'Your account is awaiting admin approval. You can sign in once an administrator approves your request.'
    ));
  elsif account_status = 'Rejected' then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'Your sign-up request was not approved. Contact your administrator for access.'
    ));
  end if;

  if event->>'authentication_method' = 'password' then
    select locked_at is not null, coalesce(require_reset, false)
      into is_locked, needs_reset
      from public.account_lockouts
     where user_id = (event->>'user_id')::uuid;
    if coalesce(is_locked, false) then
      return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'ACCOUNT_PAUSED'));
    elsif coalesce(needs_reset, false) then
      return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'PASSWORD_RESET_REQUIRED'));
    end if;
  end if;

  return event;
end;
$$;
grant execute on function public.signup_approval_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.signup_approval_access_token_hook(jsonb) from public, anon, authenticated;

commit;

-- ── Verify ──────────────────────────────────────────────────────────────────
--   select public.signup_approval_access_token_hook(jsonb_build_object(
--     'user_id', '<a locked user id>', 'authentication_method', 'password',
--     'claims', jsonb_build_object('role', 'authenticated')));
--   Expect {"error": {"http_code": 403, "message": "ACCOUNT_PAUSED"}}.
--
-- ── Rollback ────────────────────────────────────────────────────────────────
--   Re-run signup_confirmation_hook_fix_migration.sql and
--   account_lockout_migration.sql, then:
--   drop function if exists public.request_account_unlock(text);
--   drop function if exists public.record_sign_in_failure(text, text);
--   drop function if exists public.record_sign_in_success();
--   drop function if exists public.account_register_failure(uuid, boolean);
--   drop function if exists public.account_security_audit(uuid, text, text, text);
--   drop table if exists public.account_unlock_tokens;
