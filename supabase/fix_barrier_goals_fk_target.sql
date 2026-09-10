-- Point the barrier-goals join table at the right parent.
--
-- WHAT WAS WRONG
-- care_plan_barrier_goals_migration.sql created:
--   goal_id uuid not null references public.care_plan_goals(id) on delete cascade
--
-- `care_plan_goals` is the SHARED LIBRARY catalog of goal templates. The
-- barrier↔goal link is between a patient's barrier and that patient's own
-- goals, which live in `patient_care_plan_goals`. Every other similar FK in
-- the schema confirms this (patient_care_plan_barriers.goal_id,
-- patient_care_plan_goal_details.goal_id, patient_care_plan_migration:78 all
-- reference patient_care_plan_goals).
--
-- The client has always inserted patient-goal UUIDs into goal_id, which is
-- correct semantically but never matched a row in the wrong parent. So:
--
--   • Every barrier↔goal insert has been rejected with 23503 since day one.
--     The runaway 94 FK errors in a 46-second window on 2026-09-10 came from
--     one user pressing Apply Templates: each linked goal is one insert, they
--     all fail, and the drawer moved on because the schema-tolerant fallback
--     branches (useAppStore.js:343 and :3061) treat the failure as "join
--     table absent" and fall back to writing only the legacy 1:1 goal_id.
--     Users see no error and no toast; only the DB logs know.
--
--   • The migration's own backfill guarded the SAME wrong table (`exists in
--     care_plan_goals`), so it inserted zero rows. Verified today:
--       select count(*) from patient_care_plan_barrier_goals; -- 0
--     Many-to-many barrier↔goal has never actually worked; the app has been
--     serving the legacy single goal on read via mapPatientCarePlanBarrierRow's
--     fallback (useAppStore.js:307).
--
-- WHAT THIS DOES
--   1. Drops the wrong FK, adds it back pointing at patient_care_plan_goals.
--      Safe because the join table is empty (verified: 0 rows). Nothing to
--      migrate, nothing to orphan.
--   2. Re-runs the original backfill with the guard fixed. This populates the
--      join from every existing barrier's legacy goal_id so today's single-
--      goal links become proper join rows. Future many-to-many writes go
--      through the join directly.
--
-- WHAT THIS DOES NOT DO
-- The 2 additional 23505 errors on patient_care_programs_patient_id_code_key
-- during the same 46-second window are a separate issue: the same Apply
-- Templates flow tried to enroll a patient twice in the same program. Almost
-- certainly wants upsert-on-(patient_id, code) instead of insert, but it is
-- 2 errors vs 94, out of scope for this file.
--
-- The schema-tolerant fallback branches in useAppStore.js (checks for
-- error.code 42P01 / PGRST205) can stay: they now correctly no-op only in
-- the "join table truly absent" case, which after this migration will never
-- happen in prod but is still useful for older client builds hitting a
-- fresh dev database.

begin;

-- 1. Swap the FK target.
alter table public.patient_care_plan_barrier_goals
  drop constraint patient_care_plan_barrier_goals_goal_id_fkey;

alter table public.patient_care_plan_barrier_goals
  add constraint patient_care_plan_barrier_goals_goal_id_fkey
  foreign key (goal_id)
  references public.patient_care_plan_goals(id)
  on delete cascade;

-- 2. Backfill from the legacy 1:1 column, this time guarded against the
-- correct parent so the guard actually finds matches. Copy of the original
-- backfill with one word changed (care_plan_goals -> patient_care_plan_goals).
insert into public.patient_care_plan_barrier_goals (barrier_id, goal_id)
select b.id, b.goal_id
  from public.patient_care_plan_barriers b
 where b.goal_id is not null
   and exists (
     select 1 from public.patient_care_plan_goals g where g.id = b.goal_id
   )
   and not exists (
     select 1
       from public.patient_care_plan_barrier_goals j
      where j.barrier_id = b.id and j.goal_id = b.goal_id
   );

commit;

-- Verify
--   select conname, pg_get_constraintdef(oid)
--     from pg_constraint
--    where conrelid = 'public.patient_care_plan_barrier_goals'::regclass
--      and contype = 'f';
--   Expect: goal_id FK now references patient_care_plan_goals(id).
--
--   select count(*) as backfilled from public.patient_care_plan_barrier_goals;
--   Expect: > 0 (one row per barrier that has a legacy goal_id).
--
-- End to end: open any patient with existing barriers, confirm each barrier
-- still shows its linked goal. Then press Apply Templates on a fresh
-- template; the DB logs should stop emitting 23503 on
-- patient_care_plan_barrier_goals_goal_id_fkey.
--
-- Rollback
--   alter table public.patient_care_plan_barrier_goals
--     drop constraint patient_care_plan_barrier_goals_goal_id_fkey;
--   alter table public.patient_care_plan_barrier_goals
--     add constraint patient_care_plan_barrier_goals_goal_id_fkey
--     foreign key (goal_id) references public.care_plan_goals(id) on delete cascade;
--   Then truncate patient_care_plan_barrier_goals if the backfill needs to
--   go with it (the old FK would reject every existing row otherwise).
