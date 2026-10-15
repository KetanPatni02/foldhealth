-- CIS-CMB10 tracker: series length the care team picked for a vaccine.
--
-- WHY
-- Rotavirus is a 2-dose series (Rotarix) or a 3-dose series (RotaTeq).
-- Before any dose is recorded, or when the brand isn't on the record, the
-- care team picks 2 or 3 from the Vaccine Calendar. The pick drives how
-- many doses the tracker plans and counts. A recorded RotaTeq dose always
-- needs 3, whatever was picked.
--
-- KEY
-- One row per (hedis_member_id, antigen_key). id =
-- '<hedis_member_id>:<antigen_key>' so the app can upsert on it.
-- antigen_key is the tracker's vaccine key (only 'rv' today).
--
-- Idempotent. Ask Alok Kumar to run this migration on Supabase.

CREATE TABLE IF NOT EXISTS public.cis_series_doses (
  id               text PRIMARY KEY,
  hedis_member_id  text NOT NULL,
  antigen_key      text NOT NULL,
  required_doses   integer NOT NULL CHECK (required_doses BETWEEN 1 AND 5),
  updated_by       uuid,
  updated_by_name  text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hedis_member_id, antigen_key)
);

CREATE INDEX IF NOT EXISTS cis_series_doses_member_idx
  ON public.cis_series_doses (hedis_member_id);

ALTER TABLE public.cis_series_doses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on cis_series_doses" ON public.cis_series_doses;
CREATE POLICY "Allow all on cis_series_doses" ON public.cis_series_doses
  FOR ALL TO authenticated
  USING ((select auth.uid()) is not null) WITH CHECK ((select auth.uid()) is not null);
