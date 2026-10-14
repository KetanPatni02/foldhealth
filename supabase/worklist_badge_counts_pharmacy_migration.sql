-- Add the Pharmacy worklist to worklist_badge_counts.
--
-- All Patients is the deduped union of every worklist's member ids, and
-- pharmacy_worklist_members was left out of the view, so pharmacy-only
-- members never counted. This adds them to `keys`. The Pharmacy badge itself
-- keeps its own count query (fetchWorklistCounts), so no column changes.
--
-- Base definition is drop_hcc_members_v2_view_migration.sql (the live one).
-- CREATE OR REPLACE with identical columns keeps the grants and
-- security_invoker. Run after pharmacy_worklist_members_migration.sql.

CREATE OR REPLACE VIEW public.worklist_badge_counts
WITH (security_invoker = true) AS
WITH keys AS (
  SELECT 'hcc'::text AS src,
         lower(trim(both from regexp_replace(coalesce(member_id, id::text), '^#', ''))) AS k
    FROM public.hcc_members
  UNION ALL
  SELECT 'awv',
         lower(trim(both from regexp_replace(coalesce(member_id, id::text), '^#', '')))
    FROM public.awv_members
  UNION ALL
  SELECT 'ccm',
         lower(trim(both from regexp_replace(coalesce(member_id, id::text), '^#', '')))
    FROM public.ccm_worklist_members
  UNION ALL
  SELECT 'snp',
         lower(trim(both from regexp_replace(coalesce(member_id, id::text), '^#', '')))
    FROM public.snp_worklist_members
  UNION ALL
  SELECT 'jsa',
         lower(trim(both from regexp_replace(coalesce(member_id, id::text), '^#', '')))
    FROM public.jsa_members
  UNION ALL
  SELECT 'tcm',
         lower(trim(both from regexp_replace(coalesce(member_id, id::text), '^#', '')))
    FROM public.patients
  UNION ALL
  SELECT 'pharmacy',
         lower(trim(both from regexp_replace(coalesce(member_id, id::text), '^#', '')))
    FROM public.pharmacy_worklist_members
)
SELECT
  (SELECT count(DISTINCT k) FROM keys WHERE src = 'hcc' AND k <> '') AS hcc_unique,
  (SELECT count(*) FROM public.awv_members)                          AS awv,
  (SELECT count(*) FROM public.ccm_worklist_members)                 AS ccm,
  (SELECT count(*) FROM public.snp_worklist_members)                 AS snp,
  (SELECT count(*) FROM public.jsa_members)                          AS jsa,
  (SELECT count(*) FROM public.patients)                             AS tcm,
  (SELECT count(*) FROM public.patients
    WHERE agent_assigned IS NOT NULL AND agent_assigned <> '')       AS toc_ip,
  (SELECT count(DISTINCT k) FROM keys WHERE k <> '')                 AS all_patients;

-- ── Rollback ────────────────────────────────────────────────────────────────
--   Re-run section 3 of drop_hcc_members_v2_view_migration.sql (the same
--   view without the pharmacy branch).
