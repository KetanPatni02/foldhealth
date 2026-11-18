-- Pharmacy program settings (Ajay, Phase 5), per organization: refill
-- reminder days, deadline alert and escalation days, high priority only,
-- the manager's name, the holiday window and flu season. Null means the
-- app's defaults (programAutomation.js DEFAULT_PROGRAM_CONFIG). Safe to re-run.

ALTER TABLE public.org_settings
  ADD COLUMN IF NOT EXISTS pharmacy_program_config jsonb;
