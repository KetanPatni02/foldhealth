-- ============================================================
-- Forms: partial-progress / drop-off tracking
-- Run this in the Supabase SQL Editor (after forms_migration.sql).
--
-- Adds an in-progress lifecycle to form_responses so we can tell when a user
-- started filling a form but left before submitting:
--   • status        'in_progress' | 'completed'   (existing rows → 'completed')
--   • session_id    client-generated id so partial saves upsert one row per fill
--   • started_at    first answer time
--   • completed_at  submit time (null while in progress)
--   • answered_count snapshot of how many questions were answered
--
-- Drop-off rate = in_progress / (in_progress + completed).
-- ============================================================

ALTER TABLE public.form_responses
  ADD COLUMN IF NOT EXISTS status         TEXT NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS session_id     TEXT,
  ADD COLUMN IF NOT EXISTS started_at     TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS completed_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS answered_count INTEGER DEFAULT 0;

-- Backfill: every pre-existing row was a full submission.
UPDATE public.form_responses
  SET status = 'completed', completed_at = COALESCE(completed_at, created_at)
  WHERE status IS NULL OR (status = 'completed' AND completed_at IS NULL);

-- One row per (form, session) so partial autosaves upsert in place.
CREATE UNIQUE INDEX IF NOT EXISTS form_responses_form_session_idx
  ON public.form_responses (form_id, session_id)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS form_responses_status_idx
  ON public.form_responses (status);

-- forms.response_count should reflect COMPLETED submissions only. Rework the
-- counter trigger to ignore in-progress rows and react to status transitions.
CREATE OR REPLACE FUNCTION public.sync_form_response_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.status = 'completed' THEN
      UPDATE public.forms SET response_count = response_count + 1 WHERE id = NEW.form_id;
    END IF;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
      UPDATE public.forms SET response_count = response_count + 1 WHERE id = NEW.form_id;
    ELSIF NEW.status IS DISTINCT FROM 'completed' AND OLD.status = 'completed' THEN
      UPDATE public.forms SET response_count = GREATEST(0, response_count - 1) WHERE id = NEW.form_id;
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    IF OLD.status = 'completed' THEN
      UPDATE public.forms SET response_count = GREATEST(0, response_count - 1) WHERE id = OLD.form_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS form_responses_count_sync ON public.form_responses;
CREATE TRIGGER form_responses_count_sync
  AFTER INSERT OR UPDATE OR DELETE ON public.form_responses
  FOR EACH ROW EXECUTE FUNCTION public.sync_form_response_count();
