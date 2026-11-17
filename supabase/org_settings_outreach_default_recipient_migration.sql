-- Patient Outreach: who Log Outreach is addressed to by default, per
-- organization. Astrana and most clients mostly reach the PCP office; others
-- do more member outreach. The user can still switch it on each entry.
--
--   pcp     PCP / PCP Office (default)
--   member  Member
--
-- RLS is unchanged; the existing org_settings policies cover the column.

ALTER TABLE public.org_settings
  ADD COLUMN IF NOT EXISTS outreach_default_recipient text NOT NULL DEFAULT 'pcp';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'org_settings_outreach_default_recipient_check') THEN
    ALTER TABLE public.org_settings
      ADD CONSTRAINT org_settings_outreach_default_recipient_check
      CHECK (outreach_default_recipient IN ('pcp', 'member'));
  END IF;
END $$;
