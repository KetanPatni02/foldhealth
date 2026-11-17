-- Per-user layout of a side panel: which tabs and widgets show, and in what
-- order. First used by the patient profile's left panel (More > Customize),
-- panel_key 'patient-left-panel'. Mirrors user_worklist_column_prefs.
--
-- layout jsonb:
--   { tabs:    { order: [tabKey], hidden: [tabKey] },
--     widgets: { [tabKey]: { order: [widgetKey], hidden: [widgetKey] } } }
-- Keys a layout doesn't mention (added later) show, after the saved ones.
-- See src/features/patient/left-panel/patientPanelLayout.js.
--
-- Additive and idempotent. RLS: a signed-in user reads and writes only
-- their own rows.

CREATE TABLE IF NOT EXISTS public.user_panel_layouts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  panel_key   text NOT NULL,
  layout      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_panel_layouts_unique UNIQUE (user_id, panel_key)
);

CREATE OR REPLACE FUNCTION public.touch_user_panel_layouts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_user_panel_layouts ON public.user_panel_layouts;
CREATE TRIGGER trg_touch_user_panel_layouts
  BEFORE UPDATE ON public.user_panel_layouts
  FOR EACH ROW EXECUTE FUNCTION public.touch_user_panel_layouts_updated_at();

ALTER TABLE public.user_panel_layouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read own panel layouts"   ON public.user_panel_layouts;
DROP POLICY IF EXISTS "insert own panel layouts" ON public.user_panel_layouts;
DROP POLICY IF EXISTS "update own panel layouts" ON public.user_panel_layouts;
DROP POLICY IF EXISTS "delete own panel layouts" ON public.user_panel_layouts;

CREATE POLICY "read own panel layouts"
  ON public.user_panel_layouts FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "insert own panel layouts"
  ON public.user_panel_layouts FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "update own panel layouts"
  ON public.user_panel_layouts FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "delete own panel layouts"
  ON public.user_panel_layouts FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);
