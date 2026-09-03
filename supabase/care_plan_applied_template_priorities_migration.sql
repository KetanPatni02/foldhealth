-- Care Plan: per-template priority on a patient plan.
--
-- The sticky-top applied-templates strip on the Care Plan step categorizes
-- badges into High / Medium / Low rows (Figma o0rQOrz1HjBWRDTCxvsKgf node
-- 2562:59690). Priority is picked in the Add Care Plan Templates drawer
-- (Figma 2349:336796) and persists per (plan, template) as
-- { [templateId]: 'low' | 'medium' | 'high' }.
--
-- Idempotent: uses `add column if not exists` so re-running is safe.

alter table if exists public.patient_care_plans
  add column if not exists applied_template_priorities jsonb not null default '{}'::jsonb;

comment on column public.patient_care_plans.applied_template_priorities is
  'Map of templateId -> priority (low|medium|high). Categorizes applied templates on the Care Plan step sticky-top strip.';
