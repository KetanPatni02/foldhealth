-- HEDIS Care Gap reminders: rows created from the Care Gap Details drawer's
-- "Set Reminder" action and listed in its Appt/Reminders tab (Type =
-- Reminder) and on the Calendar. Each create / edit / complete / delete is
-- also logged to caregap_activity by the app.
--
-- No seed: reminders accrue as users set them.

begin;

create table if not exists public.caregap_reminders (
  id              text        primary key,
  hedis_member_id text        not null,
  -- Denormalized so the Calendar can label the event without loading
  -- the HEDIS worklist.
  member_name     text,
  gap_code        text,
  title           text        not null,
  note            text,
  remind_date     date        not null,
  remind_time     text,
  assignee        text,
  status          text        not null default 'Pending'
                              check (status in ('Pending', 'Completed')),
  created_by      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists caregap_reminders_member_idx
  on public.caregap_reminders (hedis_member_id, remind_date);

create or replace function public.touch_caregap_reminder()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists caregap_reminders_touch on public.caregap_reminders;
create trigger caregap_reminders_touch
  before update on public.caregap_reminders
  for each row execute function public.touch_caregap_reminder();

-- RLS: signed-in staff read and manage reminders (same practice-wide model
-- as caregap_activity; see RLS_POSTURE.md). The anon key gets nothing.
alter table public.caregap_reminders enable row level security;

drop policy if exists caregap_reminders_all on public.caregap_reminders;
create policy caregap_reminders_all
  on public.caregap_reminders for all
  to authenticated
  using (true)
  with check (true);

commit;

-- ── Verify ──────────────────────────────────────────────────────────────────
--   select policyname, cmd, roles from pg_policies where tablename = 'caregap_reminders';
--   Expect one policy, FOR ALL, {authenticated}.
--
-- ── Rollback ────────────────────────────────────────────────────────────────
--   drop table if exists public.caregap_reminders;
--   drop function if exists public.touch_caregap_reminder();
