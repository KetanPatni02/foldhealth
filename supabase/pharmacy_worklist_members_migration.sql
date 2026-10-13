-- Pharmacy (Med Adherence) gap worklist backing table.
-- One row per member. Open measures (MAD / MAH / MAC) live in the `measures`
-- jsonb array, each with its confirmed pickup and latest claim; the worklist
-- derives priority, the "most urgent measure" numbers, claim reconciliation
-- and the outreach summary client-side (pharmacyWorklist.utils.js).
-- Column names mirror rowToMember in src/store/slices/pharmacyWorklistSlice.js.
-- Rows are seeded by `bun run seed` (scripts/seed.js → pharmacyWorklistToRow).
-- RLS follows jsa_members_migration.sql: signed-in reads, Active-staff writes.

CREATE TABLE IF NOT EXISTS public.pharmacy_worklist_members (
  id                 text PRIMARY KEY,
  member_id          text,
  patient_id         text,
  name               text NOT NULL,
  initials           text,
  gender             text,
  age                text,
  dob                text,
  language           text DEFAULT 'en',
  health_plan        text,
  ipa                text,
  book_of_business   text,
  status             text NOT NULL DEFAULT 'Open',
  status_manual      boolean NOT NULL DEFAULT false,
  assignee_id        text,
  assignee_name      text,
  assignee_initials  text,
  lead_note          text,
  follow_up_due      text,
  barrier            text,
  days_in_queue      integer,
  prescriber         jsonb,
  pharmacy           jsonb,
  phones             jsonb NOT NULL DEFAULT '[]'::jsonb,
  call_history       jsonb NOT NULL DEFAULT '[]'::jsonb,
  intervention_log   jsonb NOT NULL DEFAULT '[]'::jsonb,
  activity_log       jsonb NOT NULL DEFAULT '[]'::jsonb,
  measures           jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pharmacy_worklist_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pharmacy_worklist_members_select ON public.pharmacy_worklist_members;
CREATE POLICY pharmacy_worklist_members_select
  ON public.pharmacy_worklist_members FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS pharmacy_worklist_members_insert ON public.pharmacy_worklist_members;
CREATE POLICY pharmacy_worklist_members_insert
  ON public.pharmacy_worklist_members FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'Active'
  ));

DROP POLICY IF EXISTS pharmacy_worklist_members_update ON public.pharmacy_worklist_members;
CREATE POLICY pharmacy_worklist_members_update
  ON public.pharmacy_worklist_members FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'Active'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'Active'
  ));

DROP POLICY IF EXISTS pharmacy_worklist_members_delete ON public.pharmacy_worklist_members;
CREATE POLICY pharmacy_worklist_members_delete
  ON public.pharmacy_worklist_members FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'Active'
  ));
