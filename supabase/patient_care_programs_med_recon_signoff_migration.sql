-- Medication Reconciliation sign-off attribution.
--
-- The step header renders "Signed by {name} ({role}) on {MM/DD/YY}" once a
-- user signs, and the Sign control is replaced by a Reviewed button. Nullable
-- so every existing enrollment stays unsigned until someone signs it.
ALTER TABLE patient_care_programs
  ADD COLUMN IF NOT EXISTS med_recon_signed_by   text,
  ADD COLUMN IF NOT EXISTS med_recon_signed_role text,
  ADD COLUMN IF NOT EXISTS med_recon_signed_at   text;

-- RLS is already enabled on patient_care_programs with an "Allow all" policy;
-- new columns inherit it, so no policy change is needed here.
