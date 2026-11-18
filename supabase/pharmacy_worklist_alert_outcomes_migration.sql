-- Pharmacy worklist: what came of each deadline alert (Ajay, Phase 5).
-- Alerts are derived from the worklist (a savable gap close to failing);
-- only each one's outcome is saved, keyed by alert ("MAD|alert",
-- "MAD|escalation"): { outcome, by, at }. Outcome is Accepted, Approved,
-- Disapproved or Ignored; a missing key is Pending. Safe to re-run.

ALTER TABLE public.pharmacy_worklist_members
  ADD COLUMN IF NOT EXISTS alert_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb;
