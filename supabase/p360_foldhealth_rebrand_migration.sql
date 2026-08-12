-- P360 profile card rebrand: the demo health plan reads "JADE Health" with a
-- made-up plan number ("##94949494WIWI"). Rename to FoldHealth and null the
-- fake plan ids — the banner now renders the patient's real Fold ID
-- (patient.memberId) in that slot, with health_plan_id only as a fallback.

BEGIN;

UPDATE public.p360_profiles
SET    health_plan_name = 'FoldHealth',
       health_plan_id   = NULL
WHERE  health_plan_name = 'JADE Health';

COMMIT;
