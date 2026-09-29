-- Let accounts be created without a name; prompt the person to add one.
--
-- THE HOLE THIS CLOSES
-- profiles_name_parts_migration.sql added the CHECK `profiles_name_parts_present`
-- (first and last name required, both capitalised). For EXISTING rows it was
-- careful: NOT VALID, no guessing, and a notification asking the stragglers to
-- fix their own name. For NEW rows it blocks creation outright. `handle_new_user()`
-- inserts a profile inside the auth.users INSERT, so any signup that carries no
-- name fails the CHECK and rolls back the whole account:
--
--   Supabase dashboard "Add user"          -> "Database error creating new user"
--   email-only signups, SSO without a name -> same
--
-- The invite drawer always sends first/last, so invites are not affected.
--
-- WHAT THIS DOES
--   1. Re-creates the CHECK so "no name yet" (both parts NULL) is allowed.
--      Everything else is unchanged: if either part is present, both must be
--      present and capitalised. "Empty" means NULL or blank: the
--      normalize_profile_name trigger runs after blank_to_null and can leave
--      '' for a nameless signup, so the check cannot rely on NULL. Still NOT VALID,
--      for the same stragglers the original migration documents.
--   2. AFTER INSERT trigger: a new profile with no name gets the same
--      `profile.name_incomplete` notification (action `openProfileName`, which
--      opens Preferences) that the original migration sent by hand. Wrapped so
--      a notification problem can never fail account creation.
--
-- No names are invented. A nameless account stays nameless until its owner
-- fills it in, exactly the state the original migration chose to tolerate.

begin;

-- ── 1. CHECK: allow both-empty, keep the rule otherwise ─────────────────────
alter table public.profiles drop constraint if exists profiles_name_parts_present;
alter table public.profiles
  add constraint profiles_name_parts_present
  check (
    (nullif(btrim(coalesce(first_name, '')), '') is null
     and nullif(btrim(coalesce(last_name, '')), '') is null)
    or (
      nullif(btrim(coalesce(first_name, '')), '') is not null
      and nullif(btrim(coalesce(last_name,  '')), '') is not null
      and first_name ~ '^[[:upper:]]'
      and last_name  ~ '^[[:upper:]]'
    )
  )
  not valid;

-- ── 2. Prompt new nameless users ────────────────────────────────────────────
create or replace function public.notify_profile_name_missing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(btrim(coalesce(new.first_name, '')), '') is null
     and nullif(btrim(coalesce(new.last_name, '')), '') is null then
    begin
      insert into public.notifications
        (recipient_id, actor_id, actor_name, type, title, body, action)
      select new.id, null, 'Fold', 'profile.name_incomplete',
             'Add your first and last name',
             'We could not find a name on your profile. Add your first and last name so teammates can identify you.',
             'openProfileName'
       where not exists (
         select 1 from public.notifications n
          where n.recipient_id = new.id and n.type = 'profile.name_incomplete'
       );
    exception when others then
      raise warning 'notify_profile_name_missing skipped: %', sqlerrm;
    end;
  end if;
  return new;
end;
$$;

revoke all on function public.notify_profile_name_missing() from public, anon, authenticated;

drop trigger if exists profiles_notify_name_missing on public.profiles;
create trigger profiles_notify_name_missing
  after insert on public.profiles
  for each row execute function public.notify_profile_name_missing();

commit;

-- ── Verify ──────────────────────────────────────────────────────────────────
-- Dashboard "Add user" with just an email now succeeds, and that user sees
-- "Add your first and last name" in the bell.
--
-- ── Rollback ────────────────────────────────────────────────────────────────
--   drop trigger if exists profiles_notify_name_missing on public.profiles;
--   drop function if exists public.notify_profile_name_missing();
--   then re-run section 5 of profiles_name_parts_migration.sql.
