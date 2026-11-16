-- HCC Outreach workflow, per organization (Astrana only today).
--
-- When on, the HCC chart workspace shows an Outreach tab beside Comments:
-- the Log Outreach form (Care Program/Gaps or HCC Gaps, call details and
-- transcript, notes per HCC, Add Contact / Schedule Follow-up / Snooze) and
-- the member's full outreach history (hcc_outreach_logs_migration.sql).
-- Off by default; an admin turns it on in Settings > Organization.
--
-- RLS is unchanged; the existing org_settings policies cover the column.

ALTER TABLE public.org_settings
  ADD COLUMN IF NOT EXISTS hcc_outreach_enabled boolean NOT NULL DEFAULT false;
