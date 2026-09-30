-- Patient snapshot for the PatientHoverCard (hover a member avatar in a
-- worklist): EHR id, Fold Score, RAF score + change, goal progress, recent
-- HIE events, AWV visit, chronic conditions, care program eligibility,
-- RAF score breakdown, engagement, active medications, task adherence and alert counts.
--
-- One row per patient (patient_id = the worklist member id). Seeded by
-- `bun run seed` (scripts/seed.js, from src/lib/patientSnapshot.js).

begin;

create table if not exists public.patient_snapshots (
  patient_id           text        primary key,
  ehr_name             text,
  ehr_id               text,
  fold_score           int,
  raf_score            numeric(5,2),
  raf_delta            numeric(5,2),
  -- { hccs: [{ label, weight, icd, icdText, recordedOn, recordedBy, source, note }],
  --   demographics: [{ label, weight }], interactions: [{ label, weight }] }
  raf_breakdown        jsonb       not null default '{}'::jsonb,
  goal_progress        int,
  hie_events           jsonb       not null default '[]'::jsonb,  -- [{ label, date }]
  awv_status           text        not null default 'Not Scheduled',
  awv_date             text,
  chronic_conditions   jsonb       not null default '[]'::jsonb,  -- [{ name, duration }]
  program_eligibility  text[]      not null default '{}',
  last_engaged_days    int,
  active_medications   int,
  task_adherence       int,
  alerts_high          int         not null default 0,
  alerts_medium        int         not null default 0,
  updated_at           timestamptz not null default now()
);

alter table public.patient_snapshots enable row level security;

drop policy if exists "Allow all" on public.patient_snapshots;
create policy "Allow all" on public.patient_snapshots for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

commit;

-- ── Rollback ────────────────────────────────────────────────────────────────
--   drop table if exists public.patient_snapshots;
