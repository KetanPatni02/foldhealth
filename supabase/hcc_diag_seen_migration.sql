-- Per-user read state for the HCC DiagPanel Documents / Comments badges.
--
-- One row per (user, patient, kind). `seen_ids` holds the document or
-- comment ids that user has already seen on that patient's DiagPanel. The
-- toolbar badge shows how many of the patient's current items are NOT in
-- this list, so documents or comments another user added since your last
-- visit are counted as new after a reload.
--
-- No seed: rows are created the first time a user opens a patient's
-- DiagPanel (everything already there is recorded as seen).

begin;

create table if not exists public.hcc_diag_seen (
  user_id       uuid        not null,
  hcc_member_id text        not null,
  kind          text        not null check (kind in ('comments', 'documents')),
  seen_ids      jsonb       not null default '[]'::jsonb,
  updated_at    timestamptz not null default now(),
  primary key (user_id, hcc_member_id, kind)
);

alter table public.hcc_diag_seen enable row level security;

drop policy if exists hcc_diag_seen_select_own on public.hcc_diag_seen;
create policy hcc_diag_seen_select_own
  on public.hcc_diag_seen for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists hcc_diag_seen_insert_own on public.hcc_diag_seen;
create policy hcc_diag_seen_insert_own
  on public.hcc_diag_seen for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists hcc_diag_seen_update_own on public.hcc_diag_seen;
create policy hcc_diag_seen_update_own
  on public.hcc_diag_seen for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

commit;
