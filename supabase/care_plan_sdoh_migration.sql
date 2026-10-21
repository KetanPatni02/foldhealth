-- SDOH as a barrier type: a barrier can carry the social-determinant domain
-- and need it records (care-plan/lib/sdohTaxonomy.js) plus the suggested
-- ICD-10-CM Z-code. Library barriers (care_plan_barriers) and the barriers on
-- a patient's plan (patient_care_plan_barriers) get the same three columns.
--
-- Community referrals (Findhelp, Unite Us) need no schema: they are
-- interventions of kind 'sdoh-referral' whose config holds the partner,
-- program, referral status and the barrier they address.
--
-- The UDS social-risk report (Analytics > SDoH & Equity) reads
-- patient_care_plan_barriers where sdoh_domain is set.
--
-- Additive and idempotent. No new table, so RLS is unchanged.

ALTER TABLE public.care_plan_barriers
  ADD COLUMN IF NOT EXISTS sdoh_domain text,
  ADD COLUMN IF NOT EXISTS sdoh_need   text,
  ADD COLUMN IF NOT EXISTS z_code      text;

ALTER TABLE public.patient_care_plan_barriers
  ADD COLUMN IF NOT EXISTS sdoh_domain text,
  ADD COLUMN IF NOT EXISTS sdoh_need   text,
  ADD COLUMN IF NOT EXISTS z_code      text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'care_plan_barriers_sdoh_domain_check') THEN
    ALTER TABLE public.care_plan_barriers
      ADD CONSTRAINT care_plan_barriers_sdoh_domain_check CHECK (
        sdoh_domain IS NULL OR sdoh_domain IN ('housing', 'food', 'transportation', 'finance', 'social', 'safety')
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_care_plan_barriers_sdoh_domain_check') THEN
    ALTER TABLE public.patient_care_plan_barriers
      ADD CONSTRAINT patient_care_plan_barriers_sdoh_domain_check CHECK (
        sdoh_domain IS NULL OR sdoh_domain IN ('housing', 'food', 'transportation', 'finance', 'social', 'safety')
      );
  END IF;
END $$;

-- The social-risk report scans SDOH barriers across every plan.
CREATE INDEX IF NOT EXISTS patient_care_plan_barriers_sdoh_idx
  ON public.patient_care_plan_barriers (sdoh_domain)
  WHERE sdoh_domain IS NOT NULL;
