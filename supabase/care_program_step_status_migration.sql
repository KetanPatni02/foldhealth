-- Care Program step status, per patient program enrollment.
--
-- The P360 Care Program step list (Outreach, Letters, HRA, Care Plan, ICT
-- Appointment, ...) used hard-coded statuses, so every patient looked done.
-- Steps backed by real records (care plan sign-off, tasks, program files,
-- med-rec sign-off, appointments) derive their status in the app. Steps with
-- no record behind them (assessments, letters, outreach, checklists,
-- reviews) keep the status a user sets here: 'completed' (Reviewed) or
-- 'skipped' (Skip). No row = not started.
--
-- patient_program_id is patient_care_programs.id; step_id is the step's id in
-- the program's step list (e.g. 'step-3b' for SNP HRA). No seed.

begin;

create table if not exists public.care_program_step_status (
  patient_program_id  text        not null,
  step_id             text        not null,
  step_name           text,
  status              text        not null check (status in ('completed', 'skipped')),
  updated_by          text,
  updated_at          timestamptz not null default now(),
  primary key (patient_program_id, step_id)
);

alter table public.care_program_step_status enable row level security;

drop policy if exists care_program_step_status_all on public.care_program_step_status;
create policy care_program_step_status_all on public.care_program_step_status
  for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

commit;

-- ── Rollback ────────────────────────────────────────────────────────────────
--   drop table if exists public.care_program_step_status;
