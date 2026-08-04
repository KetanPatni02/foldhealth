-- ============================================================
-- Patient ID unification — Fold ID becomes THE identifier
-- ============================================================
--
-- Every identity table (patients, hcc_members, awv_members,
-- ccm_worklist_members, snp_worklist_members, hedis_members, all_patients)
-- gets its `member_id` column overwritten with the bare integer Fold ID
-- already minted in patient_registry (patient_registry_migration.sql).
-- The app never reads/displays a row's internal `id` — every row
-- component shows `member.memberId` (see HccWorklistRow.jsx,
-- AllPatientsRow.jsx, TopBar.jsx search) — so `member_id` becoming the
-- Fold ID is enough to fully replace both the old payer id AND the old
-- internal id from the user's point of view, without needing to touch
-- `id` (the PK) at all.
--
-- `id` is deliberately left untouched on every table. Two independent
-- collisions surfaced while iterating on an earlier version of this
-- migration that DID try to renumber `id`:
--   - hcc_members: 3 rows already share member_id 'M-1051-2593' (spawned
--     encounter rows for one patient, by design) — collapsing `id` too
--     broke hcc_member_visits' UNIQUE(member_id, visit_index).
--   - patients: 7 rows already share one member_id, and snp_worklist_members
--     has 2 rows sharing that same member_id — collapsing `id` hit
--     patients_pkey directly.
-- Given duplicate-member_id groups have now shown up in 2 of 7 tables
-- with no advance warning, the safe, uniform rule is: `id` never changes,
-- on any table. That also means every table that cross-references a row
-- by its OLD id (hcc_member_visits, hcc_member_documents,
-- hcc_diagnosis_gaps, hcc_chart_status, hcc_removed_charts,
-- caregap_activity, ccm/snp `patient_id` cross-links) needs NO changes —
-- the ids they point at never move.
--
-- apcm_patients is intentionally excluded: separate billing roster, zero
-- cross-references into this identity graph.
--
-- Idempotent: safe to re-run. member_id is looked up fresh from
-- patient_registry each time, so re-running just reassigns the same value.

BEGIN;

-- ── 0) Self-heal: make sure every current row has a registry entry ──
-- (covers any patient rows added since the last backfill).
INSERT INTO patient_registry (member_id)
SELECT DISTINCT m FROM (
  SELECT lower(trim(both '#' from member_id)) AS m FROM patients             WHERE member_id IS NOT NULL AND member_id <> ''
  UNION SELECT lower(trim(both '#' from member_id)) FROM hcc_members          WHERE member_id IS NOT NULL AND member_id <> ''
  UNION SELECT lower(trim(both '#' from member_id)) FROM awv_members          WHERE member_id IS NOT NULL AND member_id <> ''
  UNION SELECT lower(trim(both '#' from member_id)) FROM ccm_worklist_members WHERE member_id IS NOT NULL AND member_id <> ''
  UNION SELECT lower(trim(both '#' from member_id)) FROM snp_worklist_members WHERE member_id IS NOT NULL AND member_id <> ''
  UNION SELECT lower(trim(both '#' from member_id)) FROM hedis_members        WHERE member_id IS NOT NULL AND member_id <> ''
  UNION SELECT lower(trim(both '#' from member_id)) FROM all_patients         WHERE member_id IS NOT NULL AND member_id <> ''
) src
ON CONFLICT (member_id) DO NOTHING;

INSERT INTO patient_registry (member_id)
SELECT DISTINCT lower(trim(both '#' from id))
FROM all_patients
WHERE (member_id IS NULL OR member_id = '') AND id IS NOT NULL AND id <> ''
ON CONFLICT (member_id) DO NOTHING;

-- ── 1) member_id → Fold ID, on every identity table. `id` untouched. ──
UPDATE patients p SET member_id = pr.fold_id::text
  FROM patient_registry pr WHERE pr.member_id = lower(trim(both '#' from p.member_id));

UPDATE hcc_members m SET member_id = pr.fold_id::text
  FROM patient_registry pr WHERE pr.member_id = lower(trim(both '#' from m.member_id));

UPDATE awv_members a SET member_id = pr.fold_id::text
  FROM patient_registry pr WHERE pr.member_id = lower(trim(both '#' from a.member_id));

UPDATE ccm_worklist_members c SET member_id = pr.fold_id::text
  FROM patient_registry pr WHERE pr.member_id = lower(trim(both '#' from c.member_id));

UPDATE snp_worklist_members s SET member_id = pr.fold_id::text
  FROM patient_registry pr WHERE pr.member_id = lower(trim(both '#' from s.member_id));

UPDATE hedis_members h SET member_id = pr.fold_id::text
  FROM patient_registry pr WHERE pr.member_id = lower(trim(both '#' from h.member_id));

UPDATE all_patients ap SET member_id = pr.fold_id::text
  FROM patient_registry pr WHERE pr.member_id = COALESCE(
    NULLIF(lower(trim(both '#' from ap.member_id)), ''),
    lower(trim(both '#' from ap.id))
  );

-- ── 2) patient_registry: Fold ID is now the actual primary key ──
-- (member_id stays as a UNIQUE legacy/audit column — it's no longer read
-- by the app, but the original payer id → Fold ID mapping is preserved
-- for provenance rather than dropped.)
ALTER TABLE patient_registry DROP CONSTRAINT IF EXISTS patient_registry_pkey;
ALTER TABLE patient_registry DROP CONSTRAINT IF EXISTS patient_registry_member_id_key;
ALTER TABLE patient_registry ADD PRIMARY KEY (fold_id);
ALTER TABLE patient_registry ADD CONSTRAINT patient_registry_member_id_key UNIQUE (member_id);
ALTER TABLE patient_registry ALTER COLUMN member_id DROP NOT NULL;

COMMIT;
