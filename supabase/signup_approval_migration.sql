-- Self sign-ups wait for an administrator's approval before they can sign in.
--
-- BEFORE
-- handle_new_user() gave every new account status 'Active' (or 'Invited' when
-- the signUp() call carried `invited: 'true'` in user metadata), and nothing
-- ever read `status` when issuing a session. Anyone who found the login page
-- could create an account and read every table RLS'd to `authenticated`.
-- The `invited` flag is client-supplied, so it cannot be the thing that
-- separates "an admin invited this person" from "this person let themselves in".
--
-- AFTER
--   1. `profiles.status` gains 'Pending' (awaiting review) and 'Rejected'.
--   2. `signup_invites` is an admin-only allowlist of emails. The invite drawer
--      writes the email here BEFORE calling signUp(); only admins can write it.
--   3. handle_new_user() marks an account 'Invited' when its email is on that
--      allowlist (consuming the row), and 'Pending' otherwise. The `invited`
--      metadata flag no longer decides status. Every active admin gets a
--      `user.signup_requested` notification for a Pending account.
--   4. A Custom Access Token hook refuses to mint a session for a Pending or
--      Rejected account. That covers password, OAuth, magic-link, email
--      confirmation and token refresh, because every one of them mints a JWT.
--      Approval is an ordinary admin UPDATE of `status` to 'Active' (the
--      existing "Admins can update any profile" policy already allows it).
--
-- Existing rows are untouched: every current 'Active' / 'Invited' account keeps
-- signing in exactly as before.
--
-- ⚠️ MANUAL STEP AFTER RUNNING THIS FILE
-- The hook does nothing until it is switched on:
--   Dashboard → Authentication → Hooks → "Customize Access Token (JWT) Claims"
--   → Postgres → schema `public`, function `signup_approval_access_token_hook`.
-- Until then Pending accounts are created and admins are notified, but those
-- accounts can still sign in.

begin;

-- ── 1. New statuses ─────────────────────────────────────────────────────────
alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles
  add constraint profiles_status_check
  check (status = any (array['Active', 'Inactive', 'Suspended', 'Invited', 'Pending', 'Rejected']));

-- ── 2. Invite allowlist ─────────────────────────────────────────────────────
create table if not exists public.signup_invites (
  email      text primary key check (email = lower(email)),
  invited_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.signup_invites enable row level security;

-- Admin-only in every direction. Same admin test as the existing
-- "Admins can update any profile" policy: is_profile_admin() is not granted to
-- `authenticated`, and a policy is evaluated as the querying role.
drop policy if exists "Admins manage signup invites" on public.signup_invites;
create policy "Admins manage signup invites" on public.signup_invites
  for all to authenticated
  using (exists (
    select 1 from public.profiles admin_p
     where admin_p.id = auth.uid()
       and (admin_p.admin_role in ('Admin/Practice Manager', 'Business/Practice Owner')
            or 'Admin/Practice Manager' = any(admin_p.clinical_roles))
  ))
  with check (exists (
    select 1 from public.profiles admin_p
     where admin_p.id = auth.uid()
       and (admin_p.admin_role in ('Admin/Practice Manager', 'Business/Practice Owner')
            or 'Admin/Practice Manager' = any(admin_p.clinical_roles))
  ));

-- ── 3. Signup trigger ───────────────────────────────────────────────────────
-- Unchanged apart from how `status` is decided and the admin notification.
create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'pg_catalog', 'public'
as $function$
DECLARE
  was_invited boolean;
  new_status  text;
  display     text;
BEGIN
  DELETE FROM public.signup_invites WHERE email = lower(NEW.email);
  was_invited := FOUND;
  new_status  := CASE WHEN was_invited THEN 'Invited' ELSE 'Pending' END;

  display := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NULLIF(TRIM(
      COALESCE(NEW.raw_user_meta_data->>'first_name', '') ||
      ' ' ||
      COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    ), '')
  );

  INSERT INTO public.profiles (
    id, email, full_name, status, role, admin_role, created_at, last_active_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    display,
    new_status,
    'Viewer',     -- never inherit a privileged default
    'Employer',   -- non-administrative
    NEW.created_at,
    NEW.last_sign_in_at
  )
  ON CONFLICT (id) DO NOTHING;

  -- A notification problem must never fail account creation.
  IF new_status = 'Pending' THEN
    BEGIN
      INSERT INTO public.notifications
        (recipient_id, actor_id, actor_name, type, title, body, action)
      SELECT p.id, NEW.id, COALESCE(display, NEW.email), 'user.signup_requested',
             'New sign-up awaiting approval',
             NEW.email || ' signed up and is waiting for approval.',
             'openPendingUsers'
        FROM public.profiles p
       WHERE p.status = 'Active'
         AND (p.admin_role in ('Admin/Practice Manager', 'Business/Practice Owner')
              OR 'Admin/Practice Manager' = any(coalesce(p.clinical_roles, '{}')));
    EXCEPTION WHEN others THEN
      RAISE WARNING 'signup approval notification skipped: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- ── 4. Access token hook ────────────────────────────────────────────────────
create or replace function public.signup_approval_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  account_status text;
begin
  select status into account_status
    from public.profiles
   where id = (event->>'user_id')::uuid;

  if account_status = 'Pending' then
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

  return event;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.signup_approval_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.signup_approval_access_token_hook(jsonb) from public, anon, authenticated;

grant select on table public.profiles to supabase_auth_admin;
drop policy if exists "Auth admin reads profiles for token hook" on public.profiles;
create policy "Auth admin reads profiles for token hook" on public.profiles
  for select to supabase_auth_admin
  using (true);

commit;

-- ── Verify ──────────────────────────────────────────────────────────────────
-- Existing accounts unchanged:
--   select status, count(*) from profiles group by status;
--   Expect the same Active / Invited counts as before, no Pending yet.
--
-- Hook decisions (run in the SQL editor):
--   select public.signup_approval_access_token_hook(
--     jsonb_build_object('user_id', '<an Active profile id>', 'claims', '{}'::jsonb));
--   Expect: the event echoed back.
--   Same call with a Pending profile id → {"error": {"http_code": 403, ...}}
--
-- End to end (after enabling the hook): sign up with a fresh email from the
-- login page → admins see "New sign-up awaiting approval" in the bell → the
-- new user's sign-in shows "awaiting admin approval" → an admin approves in
-- Settings → Users → the user signs in.
--
-- ── Rollback ────────────────────────────────────────────────────────────────
--   Disable the hook in the dashboard first, then:
--   drop policy if exists "Auth admin reads profiles for token hook" on public.profiles;
--   drop function if exists public.signup_approval_access_token_hook(jsonb);
--   re-run section 2 of profiles_signup_role_defaults.sql (previous handle_new_user);
--   update profiles set status = 'Active' where status in ('Pending', 'Rejected');
--   restore profiles_status_check without 'Pending' / 'Rejected';
--   drop table if exists public.signup_invites;
