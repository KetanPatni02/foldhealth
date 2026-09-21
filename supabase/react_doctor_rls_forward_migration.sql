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

commit;
