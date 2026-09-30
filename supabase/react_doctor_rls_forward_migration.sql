-- Idempotent forward migration: apply react-doctor RLS tighten on live DBs
-- that already ran the original permissive policies.
begin;

-- audience_segments, campaign_sends, care_plan_* (explicit policies)
drop policy if exists "audience_segments_authenticated_all" on public.audience_segments;
create policy "audience_segments_authenticated_all"
  on public.audience_segments for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists "campaign_sends_authenticated_all" on public.campaign_sends;
create policy "campaign_sends_authenticated_all"
  on public.campaign_sends for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists "Staff manage care_plan_audit" on public.care_plan_audit;
create policy "Staff manage care_plan_audit"
  on public.care_plan_audit for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists "Staff manage care_plan_intervention_templates" on public.care_plan_intervention_templates;
create policy "Staff manage care_plan_intervention_templates"
  on public.care_plan_intervention_templates for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists "Staff manage care_plan_links" on public.care_plan_links;
create policy "Staff manage care_plan_links"
  on public.care_plan_links for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists "Staff manage care_plan_shares" on public.care_plan_shares;
create policy "Staff manage care_plan_shares"
  on public.care_plan_shares for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists "Staff manage care_plan_template_favorites" on public.care_plan_template_favorites;
create policy "Staff manage care_plan_template_favorites"
  on public.care_plan_template_favorites for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists "Staff manage patient_care_plan_versions" on public.patient_care_plan_versions;
create policy "Staff manage patient_care_plan_versions"
  on public.patient_care_plan_versions for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists "clinical_note_versions: authenticated read" on public.clinical_note_versions;
create policy "clinical_note_versions: authenticated read"
  on public.clinical_note_versions for select to authenticated
  using ((select auth.uid()) is not null);

drop policy if exists "clinical_note_versions: authenticated insert" on public.clinical_note_versions;
create policy "clinical_note_versions: authenticated insert"
  on public.clinical_note_versions for insert to authenticated
  with check ((select auth.uid()) is not null);

drop policy if exists "clinical_notes: authenticated read" on public.clinical_notes;
drop policy if exists "clinical_notes: author or reviewer insert" on public.clinical_notes;
drop policy if exists "clinical_notes: author or reviewer update" on public.clinical_notes;
drop policy if exists "clinical_notes: authenticated full access" on public.clinical_notes;
create policy "clinical_notes: authenticated full access"
  on public.clinical_notes for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists "email_compliance_settings_authenticated_all" on public.email_compliance_settings;
create policy "email_compliance_settings_authenticated_all"
  on public.email_compliance_settings for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists funnel_events_insert_own on public.funnel_events;
create policy funnel_events_insert_own
  on public.funnel_events for insert to authenticated
  with check ((select auth.uid()) is not null);

drop policy if exists funnel_events_select_authenticated on public.funnel_events;
create policy funnel_events_select_authenticated
  on public.funnel_events for select to authenticated
  using ((select auth.uid()) is not null);

drop policy if exists "Staff manage patient_care_plan_summaries" on public.patient_care_plan_summaries;
create policy "Staff manage patient_care_plan_summaries"
  on public.patient_care_plan_summaries for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists "Staff manage patient_monitoring" on public.patient_monitoring;
create policy "Staff manage patient_monitoring"
  on public.patient_monitoring for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists "Allow all on patient_problems" on public.patient_problems;
create policy "Allow all on patient_problems" on public.patient_problems
  for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists "Allow all patient_program_activity" on public.patient_program_activity;
create policy "Allow all patient_program_activity" on public.patient_program_activity
  for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists auth_full on public.patient_care_plan_barrier_goals;
create policy auth_full on public.patient_care_plan_barrier_goals
  for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

do $$
declare t text;
begin
  foreach t in array array[
    'care_plan_goals', 'care_plan_barriers', 'care_plan_templates', 'care_plan_interventions'
  ] loop
    execute format('drop policy if exists "Staff manage %1$s" on public.%1$I', t);
    execute format(
      'create policy "Staff manage %1$s" on public.%1$I for all to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null)',
      t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'patient_care_plans', 'patient_care_plan_goals', 'patient_care_plan_interventions'
  ] loop
    execute format('drop policy if exists "Staff manage %1$s" on public.%1$I', t);
    execute format(
      'create policy "Staff manage %1$s" on public.%1$I for all to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null)',
      t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array['patient_care_plan_barriers'] loop
    execute format('drop policy if exists "Staff manage %1$s" on public.%1$I', t);
    execute format(
      'create policy "Staff manage %1$s" on public.%1$I for all to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null)',
      t);
  end loop;
end $$;

do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname from pg_policies
     where schemaname = 'public' and tablename in ('forms', 'form_responses')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

alter table public.forms enable row level security;
alter table public.form_responses enable row level security;

create policy "forms_select_authenticated"
  on public.forms for select to authenticated using ((select auth.uid()) is not null);
create policy "forms_insert_authenticated"
  on public.forms for insert to authenticated with check ((select auth.uid()) is not null);
create policy "forms_update_authenticated"
  on public.forms for update to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy "forms_delete_authenticated"
  on public.forms for delete to authenticated using ((select auth.uid()) is not null);
create policy "forms_select_active_anon"
  on public.forms for select to anon using (status = 'active');

create policy "form_responses_select_authenticated"
  on public.form_responses for select to authenticated using ((select auth.uid()) is not null);
create policy "form_responses_insert_anon"
  on public.form_responses for insert to anon with check (true);
create policy "form_responses_update_inprogress_anon"
  on public.form_responses for update to anon
  using (status = 'in_progress') with check (status in ('in_progress', 'completed'));
create policy "form_responses_insert_authenticated"
  on public.form_responses for insert to authenticated with check ((select auth.uid()) is not null);
create policy "form_responses_update_authenticated"
  on public.form_responses for update to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy "form_responses_delete_authenticated"
  on public.form_responses for delete to authenticated using ((select auth.uid()) is not null);

-- React Doctor RLS batch (2026-09): tables whose original migrations still
-- used USING (true); idempotent for DBs that already ran the forward pass.
drop policy if exists care_program_step_status_all on public.care_program_step_status;
create policy care_program_step_status_all on public.care_program_step_status
  for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists caregap_lab_orders_all on public.caregap_lab_orders;
create policy caregap_lab_orders_all on public.caregap_lab_orders
  for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
drop policy if exists caregap_lab_results_all on public.caregap_lab_results;
create policy caregap_lab_results_all on public.caregap_lab_results
  for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists referral_sender_lines_read on public.referral_sender_lines;
create policy referral_sender_lines_read
  on public.referral_sender_lines for select to authenticated
  using ((select auth.uid()) is not null);
drop policy if exists caregap_referrals_all on public.caregap_referrals;
create policy caregap_referrals_all
  on public.caregap_referrals for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists caregap_reminders_all on public.caregap_reminders;
create policy caregap_reminders_all on public.caregap_reminders
  for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists efax_numbers_all on public.efax_numbers;
create policy efax_numbers_all on public.efax_numbers
  for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists "Allow all on employer_impact_employers" on public.employer_impact_employers;
create policy "Allow all on employer_impact_employers" on public.employer_impact_employers
  for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
drop policy if exists "Allow all on employer_impact_metrics" on public.employer_impact_metrics;
create policy "Allow all on employer_impact_metrics" on public.employer_impact_metrics
  for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists "Allow all on employer_impact_report_exports" on public.employer_impact_report_exports;
create policy "Allow all on employer_impact_report_exports" on public.employer_impact_report_exports
  for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
drop policy if exists "Allow all on employer_impact_report_notes" on public.employer_impact_report_notes;
create policy "Allow all on employer_impact_report_notes" on public.employer_impact_report_notes
  for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
drop policy if exists "Allow all on employer_impact_report_settings" on public.employer_impact_report_settings;
create policy "Allow all on employer_impact_report_settings" on public.employer_impact_report_settings
  for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists "Allow all on ooo_records" on public.ooo_records;
create policy "Allow all on ooo_records" on public.ooo_records
  for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

drop policy if exists "Allow all on patient_allergies" on public.patient_allergies;
create policy "Allow all on patient_allergies" on public.patient_allergies
  for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
drop policy if exists "Allow all on patient_immunizations" on public.patient_immunizations;
create policy "Allow all on patient_immunizations" on public.patient_immunizations
  for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
drop policy if exists "Allow all on patient_history_entries" on public.patient_history_entries;
create policy "Allow all on patient_history_entries" on public.patient_history_entries
  for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
drop policy if exists "Allow all" on public.patient_snapshots;
create policy "Allow all" on public.patient_snapshots
  for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
drop policy if exists "Allow all on patient_social_history" on public.patient_social_history;
create policy "Allow all on patient_social_history" on public.patient_social_history
  for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

commit;
