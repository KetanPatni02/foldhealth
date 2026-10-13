-- Pharmacy worklist ↔ Pharmacy care program (PHARM) sync.
--
-- Run AFTER pharmacy_worklist_members_migration.sql and `bun run seed`
-- (it reads the seeded pharmacy_worklist_members rows). Idempotent.
--
--   1. Link pharmacy_worklist_members.patient_id → patients.id by exact
--      name match, so a worklist row opens the real patient profile.
--   2. Members with no patients row self-link to their own row id
--      (PatientDetailView resolves the profile from the pharmacy slice).
--   3. Every linked patient gets a PHARM care program — the invariant is
--      "pharmacy worklist member ⇒ enrolled in the Pharmacy Program", so
--      the program (Outreach, Medication Review, Pharmacy Verification,
--      Barrier & Intervention, Gap Closure, Activity Log…) is there before
--      anyone clicks the eye icon.

BEGIN;

-- 1. Name-match link to the patients table.
UPDATE public.pharmacy_worklist_members m
SET    patient_id = p.id
FROM   public.patients p
WHERE  (m.patient_id IS NULL OR m.patient_id = '')
AND    p.name = m.name;

-- 2. Self-link fallback for members with no patients row.
UPDATE public.pharmacy_worklist_members
SET    patient_id = id
WHERE  patient_id IS NULL OR patient_id = '';

-- 3. Seed the missing PHARM care program rows (one per linked patient).
INSERT INTO public.patient_care_programs
  (id, patient_id, code, name, acuity, status, status_color,
   start_date, end_date, last_updated, assignee, pcp, progress)
SELECT DISTINCT ON (m.patient_id)
  'pcp-' || m.patient_id || '-PHARM',
  m.patient_id,
  'PHARM',
  'Pharmacy Program (PHARM)',
  NULL,
  -- Gaps reopen every fill, so the program stays active: an untouched gap
  -- is New, anything already worked is Engaged.
  CASE WHEN m.status = 'Open' THEN 'New' ELSE 'Engaged' END,
  CASE WHEN m.status = 'Open' THEN 'var(--primary-300)' ELSE 'var(--status-warning)' END,
  to_char(now(), 'MM/DD/YYYY'),
  '—',
  to_char(now(), 'MM/DD/YYYY'),
  COALESCE(m.assignee_name, 'Unassigned'),
  '—',
  0
FROM public.pharmacy_worklist_members m
WHERE m.patient_id IS NOT NULL
AND   NOT EXISTS (
  SELECT 1 FROM public.patient_care_programs c
  WHERE c.patient_id = m.patient_id AND c.code = 'PHARM'
)
ORDER BY m.patient_id, m.id
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ── Rollback ────────────────────────────────────────────────────────────────
--   DELETE FROM public.patient_care_programs WHERE code = 'PHARM';
