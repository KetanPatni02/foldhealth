-- ============================================================
-- Patient Registry — one canonical Fold Patient ID per patient
-- ============================================================
--
-- Every worklist row and All Patients displays a single platform-wide
-- patient id, rendered as #F-<fold_id> (e.g. #F-10234), instead of the
-- per-worklist payer member ids (#2468…, M-1255-…, #HPM…). The registry
-- is keyed by the NORMALIZED member id — lowercased, leading '#'
-- stripped — which is the one field every worklist shares and the same
-- key All Patients already dedupes on.
--
-- fold_id is assigned once from a sequence starting at 10001 and never
-- reused. Read by fetchPatientRegistry() in src/store/useAppStore.js;
-- new patients get a row via the same normalized key.

CREATE SEQUENCE IF NOT EXISTS patient_fold_id_seq START 10001;

CREATE TABLE IF NOT EXISTS patient_registry (
  member_id  TEXT PRIMARY KEY,   -- normalized: lower(trim(both '#' from raw))
  fold_id    INT  UNIQUE NOT NULL DEFAULT nextval('patient_fold_id_seq'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- The app reads with the anon key, so an "allow all" policy is required —
-- without it RLS returns 0 rows and the UI silently falls back to showing
-- the raw member ids.
ALTER TABLE patient_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON patient_registry;
CREATE POLICY "Allow all" ON patient_registry FOR ALL USING (true) WITH CHECK (true);

-- ── Backfill: register every patient already present in any worklist ──
-- Ordered by member id so re-running against the same data assigns the
-- same fold_ids. ON CONFLICT keeps existing assignments stable.
INSERT INTO patient_registry (member_id)
SELECT m FROM (
  SELECT DISTINCT lower(trim(both '#' from member_id)) AS m FROM patients             WHERE member_id IS NOT NULL AND member_id <> ''
  UNION SELECT DISTINCT lower(trim(both '#' from member_id)) FROM hcc_members          WHERE member_id IS NOT NULL AND member_id <> ''
  UNION SELECT DISTINCT lower(trim(both '#' from member_id)) FROM hcc_members_v2       WHERE member_id IS NOT NULL AND member_id <> ''
  UNION SELECT DISTINCT lower(trim(both '#' from member_id)) FROM awv_members          WHERE member_id IS NOT NULL AND member_id <> ''
  UNION SELECT DISTINCT lower(trim(both '#' from member_id)) FROM ccm_worklist_members WHERE member_id IS NOT NULL AND member_id <> ''
  UNION SELECT DISTINCT lower(trim(both '#' from member_id)) FROM snp_worklist_members WHERE member_id IS NOT NULL AND member_id <> ''
  UNION SELECT DISTINCT lower(trim(both '#' from member_id)) FROM hedis_members        WHERE member_id IS NOT NULL AND member_id <> ''
  UNION SELECT DISTINCT lower(trim(both '#' from member_id)) FROM all_patients         WHERE member_id IS NOT NULL AND member_id <> ''
) src
ORDER BY m
ON CONFLICT (member_id) DO NOTHING;

-- Fold-native patients (all_patients rows like FOLD100001 with no payer
-- member id) key the registry on their own stable row id instead. The UI
-- resolves with (memberId || id), so these land on the same lookup.
INSERT INTO patient_registry (member_id)
SELECT DISTINCT lower(trim(both '#' from id))
FROM all_patients
WHERE (member_id IS NULL OR member_id = '') AND id IS NOT NULL AND id <> ''
ORDER BY 1
ON CONFLICT (member_id) DO NOTHING;
