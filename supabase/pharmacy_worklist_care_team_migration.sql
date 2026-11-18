-- Pharmacy worklist: who owns each step (Suresh, Session 7 changes). The
-- Coordinator, Pharmacist and Social worker beside the Assignee (the current
-- owner), by display name; null is unassigned. The demo members get their
-- roles here, since `bun run seed` skips members already in the table.

ALTER TABLE public.pharmacy_worklist_members
  ADD COLUMN IF NOT EXISTS coordinator   text,
  ADD COLUMN IF NOT EXISTS pharmacist    text,
  ADD COLUMN IF NOT EXISTS social_worker text;

UPDATE public.pharmacy_worklist_members SET coordinator = 'Priya Natarajan', pharmacist = NULL, social_worker = 'Dana Brooks' WHERE id = '19401' AND coordinator IS NULL AND pharmacist IS NULL AND social_worker IS NULL;
UPDATE public.pharmacy_worklist_members SET coordinator = 'Priya Natarajan', pharmacist = NULL, social_worker = NULL WHERE id = '19402' AND coordinator IS NULL AND pharmacist IS NULL AND social_worker IS NULL;
UPDATE public.pharmacy_worklist_members SET coordinator = 'Marcus Reyes', pharmacist = 'Nina Shah, PharmD', social_worker = NULL WHERE id = '19403' AND coordinator IS NULL AND pharmacist IS NULL AND social_worker IS NULL;
UPDATE public.pharmacy_worklist_members SET coordinator = 'Priya Natarajan', pharmacist = NULL, social_worker = NULL WHERE id = '19404' AND coordinator IS NULL AND pharmacist IS NULL AND social_worker IS NULL;
UPDATE public.pharmacy_worklist_members SET coordinator = 'Marcus Reyes', pharmacist = NULL, social_worker = 'Dana Brooks' WHERE id = '19405' AND coordinator IS NULL AND pharmacist IS NULL AND social_worker IS NULL;
UPDATE public.pharmacy_worklist_members SET coordinator = 'Priya Natarajan', pharmacist = 'Nina Shah, PharmD', social_worker = NULL WHERE id = '19406' AND coordinator IS NULL AND pharmacist IS NULL AND social_worker IS NULL;
UPDATE public.pharmacy_worklist_members SET coordinator = 'Marcus Reyes', pharmacist = NULL, social_worker = NULL WHERE id = '19407' AND coordinator IS NULL AND pharmacist IS NULL AND social_worker IS NULL;
UPDATE public.pharmacy_worklist_members SET coordinator = NULL, pharmacist = NULL, social_worker = NULL WHERE id = '19408' AND coordinator IS NULL AND pharmacist IS NULL AND social_worker IS NULL;
UPDATE public.pharmacy_worklist_members SET coordinator = 'Priya Natarajan', pharmacist = NULL, social_worker = 'Dana Brooks' WHERE id = '19409' AND coordinator IS NULL AND pharmacist IS NULL AND social_worker IS NULL;
UPDATE public.pharmacy_worklist_members SET coordinator = 'Marcus Reyes', pharmacist = NULL, social_worker = NULL WHERE id = '19410' AND coordinator IS NULL AND pharmacist IS NULL AND social_worker IS NULL;
