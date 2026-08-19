-- Store when the TOC agent was bulk-invoked so the AI Outcome column can
-- show the invocation timestamp below the Queued badge.

BEGIN;

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS ai_outcome_invoked_at TIMESTAMPTZ;

COMMIT;
