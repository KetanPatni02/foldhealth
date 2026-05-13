-- ============================================================
-- Email Builder: user-saved header/footer presets library.
-- Run after the campaigns_migration.sql.
--
-- The built-in presets live in code (HEADER_PRESETS / FOOTER_PRESETS in
-- src/features/email-builder/headerFooterLibrary.js). This table stores
-- the user's own saved presets, so when they edit a header/footer they
-- like and click "Save as preset", it joins the picker dropdown alongside
-- the built-in ones.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.email_header_footer_presets (
  id          BIGSERIAL PRIMARY KEY,
  role        TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  -- Tint used for the thumbnail in the picker; falls back to brand purple.
  accent      TEXT DEFAULT '#7C5CFA',
  -- { rootId, blocks } subtree shape — the same shape createBlockTree()
  -- and cloneBlockTree() use, so we can drop it into the document with
  -- replaceHeaderFooter() after re-IDing.
  tree        JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.email_header_footer_presets
  DROP CONSTRAINT IF EXISTS email_header_footer_presets_role_check;
ALTER TABLE public.email_header_footer_presets
  ADD CONSTRAINT email_header_footer_presets_role_check
  CHECK (role IN ('header', 'footer'));

CREATE INDEX IF NOT EXISTS email_header_footer_presets_role_idx
  ON public.email_header_footer_presets (role, created_at DESC);

ALTER TABLE public.email_header_footer_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to header/footer presets"
  ON public.email_header_footer_presets;
CREATE POLICY "Allow all access to header/footer presets"
  ON public.email_header_footer_presets FOR ALL
  USING (true) WITH CHECK (true);

-- Reuse the touch trigger function from campaigns_new_fields_migration.
DROP TRIGGER IF EXISTS email_header_footer_presets_touch_updated_at
  ON public.email_header_footer_presets;
CREATE TRIGGER email_header_footer_presets_touch_updated_at
  BEFORE UPDATE ON public.email_header_footer_presets
  FOR EACH ROW EXECUTE FUNCTION public.touch_campaigns_updated_at();
