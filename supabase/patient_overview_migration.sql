-- Patient Overview: the per-patient data behind the redesigned P360
-- "Overview" tab that has no other home.
--
-- WHAT LIVES HERE
-- The Unity synopsis (summary + key takeaways), the health chart scores,
-- highlights, suggested actions, the vitals snapshot and the care/HCC gaps
-- shown on the Overview. Care programs, care plan, tasks, notes and
-- appointments are NOT duplicated: the Overview reads their own tables.
--
-- SHAPE
-- One row per patient, keyed by the customer-facing member id, same as
-- patient_monitoring. The repeating, ordered display structures are jsonb.
-- Suggested actions carry a `status` (open | accepted | dismissed) that the
-- Overview writes back when a user accepts or dismisses one.
--
-- RLS
-- Per RLS_POSTURE.md: on, wide open to `authenticated`, closed to `anon`.

CREATE TABLE IF NOT EXISTS public.patient_overview (
  member_id           text PRIMARY KEY,
  synopsis            text,
  synopsis_emphasis   jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [string] phrases rendered in medium weight
  takeaways           jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{tone, text}]
  sources_count       int,
  generated_at        timestamptz,
  health_scores       jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{axis, patient, clinic}] scored 0-3
  health_score_change numeric,
  health_score_since  text,
  highlights          jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{id, kind, title, date, source}]
  suggested_actions   jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{id, title, reason, cta, action, status}]
  vitals              jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{key, label, value, unit, change, direction, tone, measuredAt, series}]
  vitals_source       text,
  gaps                jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{id, category, code, title, detail, status, tone, cta}]
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.patient_overview ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage patient_overview" ON public.patient_overview;
CREATE POLICY "Staff manage patient_overview"
  ON public.patient_overview FOR ALL TO authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
