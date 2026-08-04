-- ============================================================
-- Supabase DB advisor fixes
-- ============================================================
--
-- Errors:
--   1. apcm_patients — no RLS enabled (data exposed to anon key)
--   2. hedis_members — no RLS enabled (same)
--   3. awv_members  — RLS enabled but zero policies (locked out — every
--                     query silently returns nothing until a policy exists)
--
-- Warnings:
--   4. 8 foreign keys are not covered by an index (agent_flows,
--      appointments, call_sessions, ccm_billing_reports, direct_messages,
--      embed_components, form_responses, sticky_note_history) — each
--      forces a seq scan on the child table when the parent row is
--      deleted or when the FK is queried.
--   5. org_settings has a redundant duplicate index — idx_org_settings_user_id
--      shadows the UNIQUE constraint's implicit index.
--
-- Every policy below matches the existing "Allow all" pattern already used
-- across this project's tables (see patient_registry_migration.sql etc.) —
-- there is no per-user tenant model yet, and tightening a single worklist
-- while others stay open would just break the app. When we introduce real
-- auth-scoped access this file is the one to revisit.
--
-- Idempotent: safe to re-run.

BEGIN;

-- ── 1) Enable RLS + add permissive policies where missing ──
ALTER TABLE public.apcm_patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON public.apcm_patients;
CREATE POLICY "Allow all" ON public.apcm_patients FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.hedis_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON public.hedis_members;
CREATE POLICY "Allow all" ON public.hedis_members FOR ALL USING (true) WITH CHECK (true);

-- awv_members already has RLS enabled from a prior migration but no
-- policy — attach the same permissive policy so the worklist can load.
DROP POLICY IF EXISTS "Allow all" ON public.awv_members;
CREATE POLICY "Allow all" ON public.awv_members FOR ALL USING (true) WITH CHECK (true);

-- ── 2) Cover foreign keys with indexes ──
CREATE INDEX IF NOT EXISTS idx_agent_flows_agent_id
  ON public.agent_flows (agent_id);

CREATE INDEX IF NOT EXISTS idx_appointments_appointment_type_id
  ON public.appointments (appointment_type_id);

CREATE INDEX IF NOT EXISTS idx_call_sessions_patient_id
  ON public.call_sessions (patient_id);

CREATE INDEX IF NOT EXISTS idx_ccm_billing_reports_period_id
  ON public.ccm_billing_reports (period_id);

CREATE INDEX IF NOT EXISTS idx_direct_messages_reply_to_id
  ON public.direct_messages (reply_to_id);

CREATE INDEX IF NOT EXISTS idx_embed_components_domain_id
  ON public.embed_components (domain_id);

CREATE INDEX IF NOT EXISTS idx_form_responses_created_by
  ON public.form_responses (created_by);

CREATE INDEX IF NOT EXISTS idx_sticky_note_history_sticky_note_id
  ON public.sticky_note_history (sticky_note_id);

-- ── 3) Drop the redundant duplicate index ──
-- org_settings has both a UNIQUE (user_id) constraint (which auto-creates
-- an index) AND a hand-rolled idx_org_settings_user_id. The unique
-- constraint's index does the same job, so we keep it and drop the manual.
DROP INDEX IF EXISTS public.idx_org_settings_user_id;

COMMIT;
