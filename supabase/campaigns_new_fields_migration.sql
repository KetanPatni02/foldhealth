-- ============================================================
-- Campaigns: additional fields for the New Campaign builder
-- Run this in Supabase SQL Editor after campaigns_migration.sql.
--
-- Adds the data the CampaignBuilder UI captures: audience targeting,
-- delivery channels, scheduling window, campaign type (one-time vs
-- sequence), and email sender/subject metadata. Email content itself
-- continues to live in the existing email_template JSONB column.
-- ============================================================

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS audience_include JSONB    DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS audience_exclude JSONB    DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS send_via         JSONB    DEFAULT '["email"]'::jsonb,
  ADD COLUMN IF NOT EXISTS start_mode       TEXT     DEFAULT 'immediately',
  ADD COLUMN IF NOT EXISTS start_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_date         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS campaign_type    TEXT     DEFAULT 'one_time',
  ADD COLUMN IF NOT EXISTS sender_name      TEXT,
  ADD COLUMN IF NOT EXISTS send_from        TEXT,
  ADD COLUMN IF NOT EXISTS subject_line     TEXT;

-- Allowed values for the enum-like text columns. Enforced as CHECK
-- constraints (cheap to add/drop later) rather than Postgres enums so
-- we can extend them without a migration in dev.
ALTER TABLE public.campaigns
  DROP CONSTRAINT IF EXISTS campaigns_start_mode_check;
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_start_mode_check
  CHECK (start_mode IN ('immediately', 'scheduled'));

ALTER TABLE public.campaigns
  DROP CONSTRAINT IF EXISTS campaigns_campaign_type_check;
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_campaign_type_check
  CHECK (campaign_type IN ('one_time', 'sequence'));

-- Trigger to keep updated_at fresh on any mutation.
CREATE OR REPLACE FUNCTION public.touch_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaigns_touch_updated_at ON public.campaigns;
CREATE TRIGGER campaigns_touch_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.touch_campaigns_updated_at();
