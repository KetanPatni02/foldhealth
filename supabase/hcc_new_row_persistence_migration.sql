-- HCC New-Diagnosis-Gap → new worklist row persistence.
--
-- When the "New Diagnosis Gap" flow saves an ICD with a DOS that doesn't
-- exist on the current row's dos_list, the app spawns a duplicate
-- hcc_members row for the same patient (new Created date, new dos_list).
-- This migration lets both the new row AND its ICDs survive a reload.
--
-- Two changes:
-- 1. Scope hcc_diagnosis_gaps to a specific hcc_members row (via
--    member_id), not just to a patient name. Without this, two rows for
--    the same patient (different Created dates) would share every gap.
-- 2. Mark rows that were spawned client-side so the DiagPanel skips the
--    name-keyed mock-ICD fallback for them (that fallback exists to give
--    seed patients rich data and would otherwise leak the source
--    patient's ICDs into the freshly-spawned row).

-- ── 1) member_id scoping on hcc_diagnosis_gaps ────────────────────────
-- hcc_members.id is TEXT (mock ids like "hcc-4"), not UUID — the app
-- generates UUIDs client-side only for spawned rows and stores them as
-- text. The FK column matches.
ALTER TABLE hcc_diagnosis_gaps
  ADD COLUMN IF NOT EXISTS member_id TEXT
  REFERENCES hcc_members(id) ON DELETE CASCADE;

-- Backfill existing gaps: assign each gap to the earliest hcc_members
-- row matching its member_name. Pre-existing data has 1:1 name→row
-- mapping so this preserves current behavior.
UPDATE hcc_diagnosis_gaps g
SET member_id = m.id
FROM (
  SELECT DISTINCT ON (name) id, name
  FROM hcc_members
  ORDER BY name, create_date ASC
) m
WHERE g.member_id IS NULL AND g.member_name = m.name;

CREATE INDEX IF NOT EXISTS idx_hcc_gaps_member_id
  ON hcc_diagnosis_gaps(member_id);

-- ── 2) is_spawned marker on hcc_members ───────────────────────────────
ALTER TABLE hcc_members
  ADD COLUMN IF NOT EXISTS is_spawned BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 3) DOS anchor on hcc_diagnosis_gaps ───────────────────────────────
-- Manually-added gaps carry a DOS (the encounter the ICD is coded against).
-- Persisting it lets the DiagPanel restore the correct DOS grouping on
-- reload, especially for sibling rows that have multiple DOSs.
ALTER TABLE hcc_diagnosis_gaps
  ADD COLUMN IF NOT EXISTS dos TEXT;
