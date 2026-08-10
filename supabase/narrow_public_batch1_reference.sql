-- Batch 1 of the PUBLIC -> authenticated rollout: reference data.
--
-- Static lookup / vocabulary / org-config tables. No PHI, no clinical data,
-- and none is read by the public form-fill route.
--
-- Why a role swap rather than a drop: these tables have no authenticated
-- policy of their own, so removing the PUBLIC policy would leave RLS enabled
-- with zero policies and deny everything. ALTER POLICY ... TO authenticated
-- keeps each USING / WITH CHECK expression and only removes `anon`.
--
-- MUST NOT be included in any batch: `forms` and `form_responses`. App.jsx
-- renders PublicFormView for #/f/{id} WITHOUT auth, so patients filling a
-- shared form are genuinely anonymous in production and need those two tables
-- to stay reachable by `anon`.
--
-- Verified before writing: with the public anon key, every table below is
-- currently readable (e.g. icd_codes returns rows).

begin;

alter policy "Allow all for anon" on public.appointment_types to authenticated;
alter policy "Allow all for anon" on public.business_hours to authenticated;
alter policy "Enable read access for all users" on public.changelog_entries to authenticated;
alter policy "Allow all access to header/footer presets" on public.email_header_footer_presets to authenticated;
alter policy "Allow all for anon" on public.faqs to authenticated;
alter policy "Allow all for anon" on public.holidays to authenticated;
alter policy "Read icd_codes" on public.icd_codes to authenticated;
alter policy "Read pos_codes" on public.pos_codes to authenticated;
alter policy "Allow all for task_labels" on public.task_labels to authenticated;

commit;

-- ── Verify ────────────────────────────────────────────────────────────────
-- With the ANON key these should now return [] :
--   /rest/v1/icd_codes?select=code&limit=1
--   /rest/v1/pos_codes?select=code&limit=1
-- Logged in, the app's code pickers and settings panels must still populate.
--
-- select tablename, roles::text from pg_policies
--  where schemaname='public' and tablename in ('icd_codes', 'pos_codes', 'appointment_types', 'business_hours', 'holidays', 'faqs', 'changelog_entries', 'task_labels', 'email_header_footer_presets')
--  order by tablename;
-- Expected: every row {authenticated}.
--
-- ── Rollback ──────────────────────────────────────────────────────────────
-- Re-run the same statements with `to public`.
