-- Free-tier Disk IO relief (wave 2): extend per-table autovacuum tuning to
-- small tables that still show high dead-tuple ratios and last_autovacuum NULL
-- after wave 1 (tune_autovacuum_free_tier.sql).
--
-- Run in the Supabase SQL editor (or via migration). VACUUM statements at the
-- bottom must run outside a transaction.

begin;

do $$
declare
  tbl text;
  tables text[] := array[
    'jsa_members',
    'pos_codes',
    'employer_impact_report_settings',
    'employer_impact_report_notes',
    'patient_clinical_events',
    'ccm_billable_activities',
    'care_plan_shares',
    'patient_medications',
    'patient_care_plan_automations',
    'patient_problems',
    'hcc_diag_comments',
    'analytics_tables',
    'appointments',
    'hcc_member_visits',
    'clinical_notes'
  ];
begin
  foreach tbl in array tables loop
    execute format($f$
      alter table public.%I set (
        autovacuum_vacuum_threshold  = 10,
        autovacuum_vacuum_scale_factor = 0.0,
        autovacuum_analyze_threshold = 20,
        autovacuum_analyze_scale_factor = 0.05
      )
    $f$, tbl);
  end loop;
end $$;

commit;

vacuum (analyze) public.jsa_members;
vacuum (analyze) public.pos_codes;
vacuum (analyze) public.employer_impact_report_settings;
vacuum (analyze) public.employer_impact_report_notes;
vacuum (analyze) public.patient_clinical_events;
vacuum (analyze) public.ccm_billable_activities;
vacuum (analyze) public.care_plan_shares;
vacuum (analyze) public.patient_medications;
vacuum (analyze) public.patient_care_plan_automations;
vacuum (analyze) public.patient_problems;
vacuum (analyze) public.hcc_diag_comments;
vacuum (analyze) public.analytics_tables;
vacuum (analyze) public.appointments;
vacuum (analyze) public.hcc_member_visits;
vacuum (analyze) public.clinical_notes;
