-- Login Activity context (run after account_unlock_link_migration.sql).
--
-- Each account-security row in a user's Audit Log now says how and where it
-- happened: the method (Password, Google SSO, Email link, Admin console),
-- the device ("Chrome 129 on macOS") and the location ("Boston, MA"). The
-- server (api/_handlers/auth-activity.js and account-unlock.js) reads them
-- from the request headers and passes them in as a jsonb `ctx`; the client
-- never supplies them, so they can't be spoofed from the sign-in page.
--
-- How it travels: the *_ctx wrappers below put `ctx` into the transaction-
-- local setting app.auth_ctx, then call the existing function unchanged.
-- account_security_audit merges that setting into the row's details, which
-- become JSON: { text, method, device, location, ip }. The IP is stored
-- masked (last octet dropped) and isn't shown. Rows written without a ctx
-- (the password-change trigger, the paid-plan hook) keep plain-text details.
--
-- The failure and lock rows also get shorter reasons, to fit under the event
-- title: "Attempt 3 of 5 · Web", "5 failed attempts · locked by the system".

begin;

-- ── Audit helper: merges the request context when there is one ─────────────
create or replace function public.account_security_audit(target uuid, act text, detail text, actor text default 'System')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  display text;
  ctx jsonb;
begin
  begin
    ctx := nullif(current_setting('app.auth_ctx', true), '')::jsonb;
  exception when others then
    ctx := null;
  end;
  select coalesce(nullif(trim(p.full_name), ''), u.email) into display
    from auth.users u left join public.profiles p on p.id = u.id where u.id = target;
  insert into public.audit_logs (entity_type, entity_id, entity_name, action, user_name, details, category)
  values ('UserProfile', target::text, coalesce(display, target::text), act, coalesce(actor, 'System'),
          case when ctx is null or ctx = '{}'::jsonb then detail
               else (jsonb_build_object('text', detail) || ctx)::text end,
          'Security');
exception when others then
  raise warning 'security audit skipped: %', sqlerrm;
end;
$$;
revoke execute on function public.account_security_audit(uuid, text, text, text) from public, anon, authenticated;

-- ── Shorter reasons on the failure and lock rows ────────────────────────────
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
      'Wrong password while locked · attempt ' || rec.failed_count || ' · Web');
    return true;
  end if;

  perform public.account_security_audit(uid, 'Failed sign-in attempt',
    'Attempt ' || least(rec.failed_count, max_attempts) || ' of ' || max_attempts || ' · Web');

  if rec.failed_count >= max_attempts then
    update public.account_lockouts
       set locked_at = now(), locked_by = 'system', require_reset = false,
           unlocked_at = null, unlocked_by = null, unlocked_by_name = null, unlock_reason = null, unlock_note = null,
           updated_at = now()
     where user_id = uid;
    insert into public.account_lock_events (user_id, event, actor_name, detail)
    values (uid, 'locked', 'system', jsonb_build_object('attempts', rec.failed_count, 'apps', rec.failed_apps));
    perform public.account_security_audit(uid, 'Account locked',
      rec.failed_count || ' failed attempts · locked by the system');
    perform public.account_lock_alert(uid, rec.failed_count);
    return true;
  end if;
  return false;
end;
$$;
revoke execute on function public.account_register_failure(uuid, boolean) from public, anon, authenticated;

-- ── Context wrappers ────────────────────────────────────────────────────────
-- Security invoker: each runs the original function with the caller's own
-- rights, so the original's checks (wrong password, admin only) still apply.
create or replace function public.record_sign_in_failure_ctx(p_email text, p_password text, p_ctx jsonb)
returns void
language plpgsql
set search_path = public
as $$
begin
  perform set_config('app.auth_ctx', coalesce(p_ctx, '{}'::jsonb)::text, true);
  perform public.record_sign_in_failure(p_email, p_password);
end;
$$;
revoke execute on function public.record_sign_in_failure_ctx(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_sign_in_failure(text, text) to service_role;
grant execute on function public.record_sign_in_failure_ctx(text, text, jsonb) to service_role;

create or replace function public.request_account_unlock_ctx(p_email text, p_ctx jsonb)
returns void
language plpgsql
set search_path = public
as $$
begin
  perform set_config('app.auth_ctx', coalesce(p_ctx, '{}'::jsonb)::text, true);
  perform public.request_account_unlock(p_email);
end;
$$;
revoke execute on function public.request_account_unlock_ctx(text, jsonb) from public, anon, authenticated;
grant execute on function public.request_account_unlock(text) to service_role;
grant execute on function public.request_account_unlock_ctx(text, jsonb) to service_role;

-- Called by api/_handlers/account-unlock.js with the admin's own token, so
-- admin_unlock_account still checks that the caller is a practice admin.
create or replace function public.admin_unlock_account_ctx(
  target uuid, reason text, note text, identity_confirmed boolean, require_reset boolean, ctx jsonb
)
returns public.account_lockouts
language plpgsql
set search_path = public
as $$
begin
  perform set_config('app.auth_ctx', coalesce(ctx, '{}'::jsonb)::text, true);
  return public.admin_unlock_account(target, reason, note, identity_confirmed, require_reset);
end;
$$;
revoke execute on function public.admin_unlock_account_ctx(uuid, text, text, boolean, boolean, jsonb) from public, anon;
grant execute on function public.admin_unlock_account_ctx(uuid, text, text, boolean, boolean, jsonb) to authenticated;

commit;

-- Rollback:
--   drop function if exists public.record_sign_in_failure_ctx(text, text, jsonb);
--   drop function if exists public.request_account_unlock_ctx(text, jsonb);
--   drop function if exists public.admin_unlock_account_ctx(uuid, text, text, boolean, boolean, jsonb);
--   then re-run account_unlock_link_migration.sql for the previous
--   account_security_audit and account_register_failure.
