-- ============================================================
-- HCC per-member Activity Log (DiagPanel Timeline tab).
--
-- Ported from src/features/hcc/data/activity.js — mixed event types
-- (group / status_dos / status_hcc / accept / dismiss / delete /
-- upload / create / override / comment / outreach / assign_coder)
-- share a common shape but carry per-type extras (details[], file,
-- avatars). We store each entry's raw shape in a JSONB column so
-- new event types can land without a schema migration.
--
-- Keyed by member_name; '_default' rows serve any member without a
-- specific timeline seeded, matching getActivityForMember's fallback.
-- ============================================================

CREATE TABLE IF NOT EXISTS hcc_gap_activity (
  id           TEXT PRIMARY KEY,
  member_name  TEXT NOT NULL,       -- '_default' for the fallback set
  sort_order   INT  NOT NULL,
  entry        JSONB NOT NULL,      -- full mock entry preserved as-is
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hcc_gap_activity_member ON hcc_gap_activity (member_name, sort_order);

ALTER TABLE hcc_gap_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for hcc_gap_activity" ON hcc_gap_activity;
CREATE POLICY "Allow all for hcc_gap_activity" ON hcc_gap_activity FOR ALL USING (true);

TRUNCATE hcc_gap_activity;

INSERT INTO hcc_gap_activity (id, member_name, sort_order, entry) VALUES
  -- Annette Brave (9 entries)
  ('act-ab-0', 'Annette Brave', 0, '{"t":"group","label":"Jan 2026"}'::jsonb),
  ('act-ab-1', 'Annette Brave', 1, '{"t":"outreach","date":"06/01","time":"12:30 PM","by":"Delores Conn","role":"Coder","dos":null,"icds":["E11.22","E11.21","E44.0","E11.51"],"headline":"Outreach log for HCC 18, HCC 112 & HCC 120","tag":"Provider Communication"}'::jsonb),
  ('act-ab-2', 'Annette Brave', 2, '{"t":"status_dos","date":"01/26/2026","time":"12:30 PM","by":"Benjamin Cummings","role":"QA","dos":"03/04/2025","icds":["E11.22","E11.21","E44.0","E11.51"],"headline":"DOS 03/04/2025 Status Changed","from":"Open","to":"Returned"}'::jsonb),
  ('act-ab-3', 'Annette Brave', 3, '{"t":"status_hcc","date":"01/24/2026","time":"12:30 PM","by":"Automation","role":null,"dos":"03/04/2025","icds":["E11.22","E11.21","E44.0"],"headline":"HCC 18, HCC 112 and HCC 120 Status Changed","from":"Open","to":"Audited"}'::jsonb),
  ('act-ab-4', 'Annette Brave', 4, '{"t":"accept","date":"01/24/2026","time":"12:30 PM","by":"Delores Conn","role":"Coder","dos":"03/04/2025","icds":["E11.22","E11.51","E44.0"],"headline":"3 ICD: E11.22, E11.51 and E44.0 Status Changed to Accept","details":[{"hcc":"HCC 18 - Diabetes w/ Complications","icd":"E11.22 - Type 2 diabetes with diabetic chronic kidney disease","from":"None","to":"Accepted"},{"hcc":"HCC 108 - Peripheral Vascular Disease","icd":"E11.51 - Type 2 diabetes mellitus with diabetic peripheral angiopathy without gangrene","from":"None","to":"Accepted"},{"hcc":"HCC 120 - Protein-Calorie Malnutrition","icd":"E44.0 - Moderate protein-calorie malnutrition","from":"None","to":"Accepted"}]}'::jsonb),
  ('act-ab-5', 'Annette Brave', 5, '{"t":"dismiss","date":"01/21/2026","time":"12:30 PM","by":"Lucy Moen","role":"Compliance","dos":"03/04/2025","icds":["I47.1"],"headline":"ICD: I47.1  Status Changed to Dismiss","details":[{"hcc":"HCC 18 - Diabetes w/ Complications","icd":"I47.1 - Supraventricular Tachycardia","reason":"Condition Not Present (Unsupported, Resolved or Transient)","note":"Condition Not Present (Unsupported, Resolved or Transient)","from":"Accepted","to":"Dismissed"}]}'::jsonb),
  ('act-ab-6', 'Annette Brave', 6, '{"t":"delete","date":"01/15/2026","time":"12:30 PM","by":"Delores Conn","role":"Coder","dos":"03/04/2025","icds":["E11.51"],"headline":"ICD: E11.51(Manual) is Deleted","details":[{"hcc":"HCC 108 - Peripheral Vascular Disease","icd":"E11.51 - Type 2 diabetes mellitus with diabetic peripheral angiopathy without gangrene"}]}'::jsonb),
  ('act-ab-7', 'Annette Brave', 7, '{"t":"upload","date":"01/15/2026","time":"12:30 PM","by":"Delores Conn","role":"Support Team","dos":"03/04/2025","icds":["E11.51","E11.22"],"headline":"Document Uploaded for HCC18 (E11.51) and HCC48 (E11.22)","file":"Tracheostomy Imaging.pdf","fileType":"Imaging Report"}'::jsonb),
  ('act-ab-8', 'Annette Brave', 8, '{"t":"create","date":"01/11/2026","time":"12:30 PM","by":"Benjamin Cummings","role":"QA","dos":"03/04/2025","icds":["E11.51"],"headline":"ICD: E11.51 Created Manually"}'::jsonb),
  ('act-ab-9', 'Annette Brave', 9, '{"t":"assign_coder","date":"01/10/2026","time":"12:30 PM","by":"Benjamin Cummings","role":"QA","dos":"03/04/2025","icds":["E11.22","E11.21","E44.0","E11.51"],"headline":"Coder Changed","fromAvatar":{"initials":"AR","name":"Dr. Aldo Richman"},"toAvatar":{"initials":"BC","name":"Benjamin Cummings"}}'::jsonb),

  -- Frank Green (6 entries)
  ('act-fg-0', 'Frank Green', 0, '{"t":"group","label":"Jan 2026"}'::jsonb),
  ('act-fg-1', 'Frank Green', 1, '{"t":"status_dos","date":"01/26/2026","time":"10:00 AM","by":"L. Schmidt","role":"QA","dos":"09/28/2023","icds":["I50.9","E11.9","J44.1"],"headline":"DOS 09/28/2023 Status Changed to Completed","from":"In Progress","to":"Completed"}'::jsonb),
  ('act-fg-2', 'Frank Green', 2, '{"t":"accept","date":"01/15/2026","time":"09:00 AM","by":"L. Schmidt","role":"QA","dos":"09/28/2023","icds":["I50.9"],"headline":"ICD: I50.9 Status Changed to Accept","details":[{"hcc":"HCC 85 - Congestive Heart Failure","icd":"I50.9 - Heart failure, unspecified","from":"None","to":"Accepted"}]}'::jsonb),
  ('act-fg-3', 'Frank Green', 3, '{"t":"dismiss","date":"01/12/2026","time":"03:00 PM","by":"J. Levesque","role":"Coder","dos":"09/28/2023","icds":["E11.9"],"headline":"ICD: E11.9 Status Changed to Dismiss","details":[{"hcc":"HCC 18 - Diabetes w/ Complications","icd":"E11.9 - Type 2 DM w/o complications","reason":"Documentation insufficient","note":"No supporting notes found","from":"New","to":"Dismissed"}]}'::jsonb),
  ('act-fg-4', 'Frank Green', 4, '{"t":"upload","date":"01/10/2026","time":"11:00 AM","by":"L. Schmidt","role":"Support Team","dos":"09/28/2023","icds":["J44.1","I50.9"],"headline":"Document Uploaded for HCC 111 (J44.1)","file":"COPD Evaluation.pdf","fileType":"Lab Report"}'::jsonb),
  ('act-fg-5', 'Frank Green', 5, '{"t":"create","date":"01/09/2026","time":"02:00 PM","by":"J. Levesque","role":"Coder","dos":"09/28/2023","icds":["J44.1"],"headline":"ICD: J44.1 Created Manually"}'::jsonb),
  ('act-fg-6', 'Frank Green', 6, '{"t":"assign_coder","date":"01/08/2026","time":"09:00 AM","by":"L. Schmidt","role":"QA","dos":"09/28/2023","icds":["I50.9","E11.9","J44.1"],"headline":"Coder Changed","fromAvatar":{"initials":"DH","name":"D. Hintz"},"toAvatar":{"initials":"JL","name":"J. Levesque"}}'::jsonb),

  -- Brian Carter (6 entries)
  ('act-bc-0', 'Brian Carter', 0, '{"t":"group","label":"Nov 2023"}'::jsonb),
  ('act-bc-1', 'Brian Carter', 1, '{"t":"accept","date":"11/29/2023","time":"02:00 PM","by":"M. Almeda","role":"QA","dos":"11/29/2023","icds":["F32.1","E11.65"],"headline":"2 ICD: F32.1, E11.65 Status Changed to Accept","details":[{"hcc":"HCC 58 - Major Depression","icd":"F32.1 - Major depressive disorder, single episode","from":"None","to":"Accepted"},{"hcc":"HCC 18 - Diabetes w/ Complications","icd":"E11.65 - Type 2 DM w/ hyperglycemia","from":"None","to":"Accepted"}]}'::jsonb),
  ('act-bc-2', 'Brian Carter', 2, '{"t":"dismiss","date":"11/20/2023","time":"11:00 AM","by":"D. Hintz","role":"Coder","dos":"05/20/2024","icds":["M79.3"],"headline":"ICD: M79.3 Status Changed to Dismiss","details":[{"hcc":"HCC 40 - Rheumatoid Arthritis","icd":"M79.3 - Panniculitis, unspecified","reason":"Not supported by documentation","note":"","from":"New","to":"Dismissed"}]}'::jsonb),
  ('act-bc-3', 'Brian Carter', 3, '{"t":"status_dos","date":"11/15/2023","time":"09:00 AM","by":"D. Hintz","role":"Coder","dos":"11/29/2023","icds":["F32.1","E11.65","I48.91","M79.3"],"headline":"DOS 11/29/2023 Status Changed","from":"New","to":"In Progress"}'::jsonb),
  ('act-bc-4', 'Brian Carter', 4, '{"t":"create","date":"11/12/2023","time":"10:00 AM","by":"D. Hintz","role":"Coder","dos":"11/29/2023","icds":["I48.91"],"headline":"ICD: I48.91 Created Manually"}'::jsonb),
  ('act-bc-5', 'Brian Carter', 5, '{"t":"upload","date":"11/11/2023","time":"01:00 PM","by":"M. Almeda","role":"Support Team","dos":"11/29/2023","icds":["F32.1","E11.65"],"headline":"Document Uploaded for HCC58 (F32.1)","file":"Psych Evaluation.pdf","fileType":"Clinical Note"}'::jsonb),
  ('act-bc-6', 'Brian Carter', 6, '{"t":"assign_coder","date":"11/10/2023","time":"09:00 AM","by":"M. Almeda","role":"QA","dos":"11/29/2023","icds":["F32.1","E11.65","I48.91","M79.3"],"headline":"Coder Changed","fromAvatar":{"initials":"AR","name":"A. Reed"},"toAvatar":{"initials":"DH","name":"D. Hintz"}}'::jsonb),

  -- _default (9 entries)
  ('act-df-0', '_default', 0, '{"t":"group","label":"Jan 2026"}'::jsonb),
  ('act-df-1', '_default', 1, '{"t":"status_hcc","date":"01/24/2026","time":"12:30 PM","by":"Automation","role":null,"dos":"07/04/2024","icds":["E11.21","I48.91","J44.0"],"headline":"HCC 18, HCC 96 and HCC 111 Status Changed","from":"Open","to":"Audited"}'::jsonb),
  ('act-df-2', '_default', 2, '{"t":"accept","date":"01/24/2026","time":"12:30 PM","by":"N. Richards","role":"QA","dos":"07/04/2024","icds":["E11.21","I48.91"],"headline":"2 ICD: E11.21, I48.91 Status Changed to Accept","details":[{"hcc":"HCC 18 - Diabetes w/ Complications","icd":"E11.21 - Type 2 diabetes with diabetic nephropathy","from":"None","to":"Accepted"},{"hcc":"HCC 96 - Atrial Fibrillation","icd":"I48.91 - Unspecified atrial fibrillation","from":"None","to":"Accepted"}]}'::jsonb),
  ('act-df-3', '_default', 3, '{"t":"dismiss","date":"01/21/2026","time":"12:30 PM","by":"Lucy Moen","role":"Compliance","dos":"07/04/2024","icds":["I50.9"],"headline":"ICD: I50.9  Status Changed to Dismiss","details":[{"hcc":"HCC 85 - Congestive Heart Failure","icd":"I50.9 - Heart failure, unspecified","reason":"Condition Not Present (Unsupported, Resolved or Transient)","from":"Accepted","to":"Dismissed"}]}'::jsonb),
  ('act-df-4', '_default', 4, '{"t":"delete","date":"01/15/2026","time":"12:30 PM","by":"D. Hintz","role":"Coder","dos":"07/04/2024","icds":["F32.1"],"headline":"ICD: F32.1(Manual) is Deleted","details":[{"hcc":"HCC 58 - Major Depression","icd":"F32.1 - Major depressive disorder, single episode"}]}'::jsonb),
  ('act-df-5', '_default', 5, '{"t":"upload","date":"01/14/2026","time":"09:00 AM","by":"A. Beauchamp","role":"Support Team","dos":"07/04/2024","icds":["E11.21","J44.0"],"headline":"Document Uploaded for HCC18 (E11.21) and HCC111 (J44.0)","file":"Progress Note.pdf","fileType":"Visit Note"}'::jsonb),
  ('act-df-6', '_default', 6, '{"t":"create","date":"01/11/2026","time":"12:30 PM","by":"Benjamin Cummings","role":"QA","dos":"07/04/2024","icds":["I48.91"],"headline":"ICD: I48.91 Created Manually"}'::jsonb),
  ('act-df-7', '_default', 7, '{"t":"override","date":"01/09/2026","time":"12:30 PM","by":"Automation","role":null,"dos":"07/04/2024","icds":["J44.0"],"headline":"HCC 111 Overridden by HCC 112"}'::jsonb),
  ('act-df-8', '_default', 8, '{"t":"comment","date":"01/06/2026","time":"12:30 PM","by":"Dr Aldo Richman","role":"Physician","dos":"07/04/2024","icds":["E11.21","F32.1"],"headline":"Added a Comment for HCC18 (E11.21), HCC58 (F32.1)"}'::jsonb),
  ('act-df-9', '_default', 9, '{"t":"assign_coder","date":"01/10/2026","time":"09:00 AM","by":"A. Beauchamp","role":"Support","dos":"07/04/2024","icds":["E11.21","I48.91","J44.0","I50.9","F32.1"],"headline":"Coder Changed","fromAvatar":{"initials":"DH","name":"D. Hintz"},"toAvatar":{"initials":"NR","name":"N. Richards"}}'::jsonb);

-- Verify:
--   SELECT member_name, count(*) FROM hcc_gap_activity GROUP BY member_name ORDER BY member_name;
