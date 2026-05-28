-- ============================================================
-- Campaigns: category + updated_by columns
-- Run this in Supabase SQL Editor after campaigns_new_fields_migration.sql.
--
-- Drives the Settings → Content → Emails table:
--   • `category`    — free-form label so emails can be grouped (e.g.
--                     "Marketing", "Newsletter", "Transactional"). Users
--                     pick this in the email builder.
--   • `updated_by`  — uuid of the auth.users row that last touched the
--                     campaign. The Settings → Content list shows it under
--                     the "Last Updated By" column.
--
-- Existing rows keep working — both columns are nullable and the UI falls
-- back to "—" when null.
-- ============================================================

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS category   TEXT,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id);
-- FK targets profiles (which itself FKs to auth.users) so PostgREST can
-- auto-resolve the join used by Settings → Content → Emails when it selects
-- `updated_by_profile:profiles!updated_by(id, full_name)`.

-- Index updated_by so any future "emails I edited" filter stays cheap. It's
-- low-cardinality vs. user count so a plain b-tree index is fine.
CREATE INDEX IF NOT EXISTS campaigns_updated_by_idx
  ON public.campaigns (updated_by);

-- Index category for the same reason — listing/grouping by category.
CREATE INDEX IF NOT EXISTS campaigns_category_idx
  ON public.campaigns (category);

-- Stamp updated_by automatically on every write so the application never has
-- to remember to pass it. auth.uid() is the authenticated user from
-- Supabase's session JWT — null for service-role / unauthenticated requests
-- (which is fine: NULL falls back to "—" in the UI).
CREATE OR REPLACE FUNCTION public.touch_campaigns_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by = COALESCE(auth.uid(), NEW.updated_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS campaigns_touch_updated_by ON public.campaigns;
CREATE TRIGGER campaigns_touch_updated_by
  BEFORE INSERT OR UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.touch_campaigns_updated_by();
