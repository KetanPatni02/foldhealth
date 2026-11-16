-- HCC Outreach workflow: on by default.
--
-- org_settings_hcc_outreach_migration.sql added hcc_outreach_enabled as off
-- by default. The workflow now ships on: new rows default to true and every
-- existing row is turned on. An admin can still turn it off in
-- Settings > Organization. The app also treats a missing column as on.
--
-- Run after org_settings_hcc_outreach_migration.sql. Safe to re-run.

ALTER TABLE public.org_settings
  ADD COLUMN IF NOT EXISTS hcc_outreach_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.org_settings
  ALTER COLUMN hcc_outreach_enabled SET DEFAULT true;

UPDATE public.org_settings SET hcc_outreach_enabled = true WHERE hcc_outreach_enabled = false;
