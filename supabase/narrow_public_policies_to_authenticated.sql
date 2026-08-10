-- Narrow every wide-open PUBLIC policy to authenticated.
--
-- 79 policies across 70 tables currently grant
-- USING (true) / WITH CHECK (true) to PUBLIC. In Postgres, PUBLIC means every
-- role — including `anon`, whose key ships in the browser bundle. So these
-- tables (patient_registry, hcc_diagnosis_gaps, all_patients, audit_logs,
-- tasks, call_details, …) are readable and writable by anyone with the
-- published anon key. RLS is enabled on all of them, but it is not gating
-- anything.
--
-- IMPORTANT — this is a role swap, not a removal. 69 of the 70 tables have NO
-- authenticated policy of their own: the PUBLIC policy is the only one they
-- have. Dropping it would leave RLS on with zero policies, which denies
-- everything and takes the app down. ALTER POLICY ... TO authenticated keeps
-- each policy's USING / WITH CHECK expression exactly as-is and only removes
-- `anon` from the role list.
--
-- Effect for a logged-in user: none. Every one of these policies still applies
-- to them, unchanged. Effect for an unauthenticated caller: no access.
--
-- Verified: production always authenticates. The dev bypass renders only when
-- window.location.hostname === 'localhost' (LoginPage.jsx:426); App.jsx:40
-- notes those sessions stay anonymous. Local dev-bypass sessions will see
-- empty data until they log in, which is the correct behaviour.
--
-- Generated from pg_policies on 2026-08-10 — regenerate rather than
-- hand-editing if the policy set has drifted.
--
-- Suggested rollout: run in batches by feature area, exercising the app
-- between batches, rather than all 79 at once.

begin;

alter policy "Allow all access on agent_config" on public.agent_config to authenticated;
alter policy "Allow all for anon" on public.agent_flows to authenticated;
alter policy "Allow all for anon" on public.agent_rules to authenticated;
alter policy "Allow all access on agents" on public.agents to authenticated;
alter policy "all_patients_read" on public.all_patients to authenticated;
alter policy "all_patients_write" on public.all_patients to authenticated;
alter policy "analytics_configs_read" on public.analytics_configs to authenticated;
alter policy "analytics_configs_write" on public.analytics_configs to authenticated;
alter policy "analytics_kpis_read" on public.analytics_kpis to authenticated;
alter policy "analytics_kpis_write" on public.analytics_kpis to authenticated;
alter policy "analytics_bars_read" on public.analytics_progress_bars to authenticated;
alter policy "analytics_bars_write" on public.analytics_progress_bars to authenticated;
alter policy "analytics_tables_read" on public.analytics_tables to authenticated;
alter policy "analytics_tables_write" on public.analytics_tables to authenticated;
alter policy "analytics_ts_read" on public.analytics_time_series to authenticated;
alter policy "analytics_ts_write" on public.analytics_time_series to authenticated;
alter policy "Allow all" on public.apcm_patients to authenticated;
alter policy "Allow all for anon" on public.appointment_types to authenticated;
alter policy "Allow all for anon" on public.appointments to authenticated;
alter policy "Allow all for audit_logs" on public.audit_logs to authenticated;
alter policy "Allow all" on public.awv_members to authenticated;
alter policy "Allow all for anon" on public.business_hours to authenticated;
alter policy "Allow all for anon" on public.call_details to authenticated;
alter policy "Allow all access to campaigns" on public.campaigns to authenticated;
alter policy "Allow all for care_teams" on public.care_teams to authenticated;
alter policy "Allow all for caregap_activity" on public.caregap_activity to authenticated;
alter policy "Allow all for ccm_billable_activities" on public.ccm_billable_activities to authenticated;
alter policy "Allow all for ccm_billing_periods" on public.ccm_billing_periods to authenticated;
alter policy "Allow all for ccm_billing_reports" on public.ccm_billing_reports to authenticated;
alter policy "Allow all for ccm_worklist_members" on public.ccm_worklist_members to authenticated;
alter policy "Enable read access for all users" on public.changelog_entries to authenticated;
alter policy "Allow all for anon" on public.chat_groups to authenticated;
alter policy "Allow all for anon" on public.chat_participants to authenticated;
alter policy "Allow all access to header/footer presets" on public.email_header_footer_presets to authenticated;
alter policy "Allow all for embed_components" on public.embed_components to authenticated;
alter policy "Allow all for embed_domains" on public.embed_domains to authenticated;
alter policy "Allow all for anon" on public.faqs to authenticated;
alter policy "Allow all access to form_responses" on public.form_responses to authenticated;
alter policy "Allow all access to forms" on public.forms to authenticated;
alter policy "Allow all for anon" on public.goals to authenticated;
alter policy "Allow all for hcc_added_charts" on public.hcc_added_charts to authenticated;
alter policy "Allow all for hcc_chart_status" on public.hcc_chart_status to authenticated;
alter policy "Allow all for hcc_diag_comments" on public.hcc_diag_comments to authenticated;
alter policy "Allow all for hcc_diag_documents" on public.hcc_diag_documents to authenticated;
alter policy "Allow all for hcc_diag_history" on public.hcc_diag_history to authenticated;
alter policy "Allow all for hcc_diag_notes" on public.hcc_diag_notes to authenticated;
alter policy "Allow all for hcc_diagnosis_gaps" on public.hcc_diagnosis_gaps to authenticated;
alter policy "Enable read access for all users" on public.hcc_diagnosis_gaps to authenticated;
alter policy "Allow all for hcc_documents" on public.hcc_documents to authenticated;
alter policy "Allow all for hcc_gap_activity" on public.hcc_gap_activity to authenticated;
alter policy "Allow all for hcc_gap_confidence" on public.hcc_gap_confidence to authenticated;
alter policy "Allow all for hcc_gap_dos_actions" on public.hcc_gap_dos_actions to authenticated;
alter policy "Allow all for hcc_gap_sweep" on public.hcc_gap_sweep to authenticated;
alter policy "Enable read access for all users" on public.hcc_member_documents to authenticated;
alter policy "Allow all for hcc_member_raf" on public.hcc_member_raf to authenticated;
alter policy "Enable read access for all users" on public.hcc_member_visits to authenticated;
alter policy "Allow all for hcc_members" on public.hcc_members to authenticated;
alter policy "Enable read access for all users" on public.hcc_members to authenticated;
alter policy "Allow all for hcc_removed_charts" on public.hcc_removed_charts to authenticated;
alter policy "Allow all" on public.hedis_members to authenticated;
alter policy "Allow all for anon" on public.holidays to authenticated;
alter policy "Read icd_codes" on public.icd_codes to authenticated;
alter policy "Allow all letters" on public.letters to authenticated;
alter policy "Allow all for anon" on public.p360_profiles to authenticated;
alter policy "Allow all for patient_care_programs" on public.patient_care_programs to authenticated;
alter policy "Allow all" on public.patient_registry to authenticated;
alter policy "Allow all access" on public.patients to authenticated;
alter policy "population_groups_read" on public.population_groups to authenticated;
alter policy "population_groups_write" on public.population_groups to authenticated;
alter policy "Read pos_codes" on public.pos_codes to authenticated;
alter policy "Allow all for practice_locations" on public.practice_locations to authenticated;
alter policy "Allow all for snp_worklist_members" on public.snp_worklist_members to authenticated;
alter policy "Allow all for anon" on public.sticky_note_history to authenticated;
alter policy "Allow all for anon" on public.sticky_notes to authenticated;
alter policy "Allow all for task_audit_log" on public.task_audit_log to authenticated;
alter policy "Allow all for task_labels" on public.task_labels to authenticated;
alter policy "Allow all for task_pools" on public.task_pools to authenticated;
alter policy "Allow all for tasks" on public.tasks to authenticated;
alter policy "Allow all" on public.user_worklist_prefs to authenticated;
commit;

-- ── Verify ────────────────────────────────────────────────────────────────
-- select count(*) from pg_policies
--  where schemaname='public' and roles::text='{public}'
--    and (qual='true' or with_check='true');
-- Expected: 0
--
-- Confirm nothing was left uncovered (every table still has >= 1 policy):
-- select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
--  where n.nspname='public' and c.relkind='r' and c.relrowsecurity
--    and not exists (select 1 from pg_policies p where p.tablename=c.relname)
--  order by 1;
-- Expected: 0 rows.
--
-- ── Rollback ──────────────────────────────────────────────────────────────
-- Re-run with `to public` instead of `to authenticated`.
