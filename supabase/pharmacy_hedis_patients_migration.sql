-- Pharmacy patients on HEDIS: Open Care Gaps on a pharmacy row open Care
-- Gap Details. Run after pharmacy_worklist_sample_refresh_migration.sql.
--
-- 1. Every pharmacy demo member (19401-19410) gets a patient_registry entry.
-- 2. pharmacy_worklist_members.member_id becomes the Fold ID, as on every
--    other worklist.
-- 3. Each member with other care gaps gets a ph-<id> hedis_members row with
--    the same Fold ID, so the worklist joins the two. Generated from
--    src/features/hedis-worklist/data/mock.js.
--
-- Safe to run more than once: existing registry entries and HEDIS rows are
-- kept, and only rows still on the raw member id are remapped.

begin;

insert into public.patient_registry (member_id)
select v.member_id
from (values ('19401'), ('19402'), ('19403'), ('19404'), ('19405'), ('19406'), ('19407'), ('19408'), ('19409'), ('19410')) as v(member_id)
on conflict (member_id) do nothing;

update public.pharmacy_worklist_members as m
set member_id = r.fold_id::text
from public.patient_registry as r
where m.id in ('19401', '19402', '19403', '19404', '19405', '19406', '19407', '19408', '19409', '19410')
  and m.member_id = m.id
  and r.member_id = lower(trim(m.member_id));

insert into public.hedis_members (
  id, initials, name, gender, age, member_id, language, gaps, assignee, assignee_initials,
  start_date, adv_illness, frailty, risk_level, tasks, outreach_dots, outreach_date,
  member_status, phone, dob, ipa, hp_code, zip, city, state
)
select v.id, v.initials, v.name, v.gender, v.age, r.fold_id::text, v.language, v.gaps, v.assignee, v.assignee_initials,
  v.start_date, v.adv_illness, v.frailty, v.risk_level, v.tasks::integer, v.outreach_dots, v.outreach_date,
  v.member_status, v.phone, v.dob, v.ipa, v.hp_code, v.zip, v.city, v.state
from (values
  ('ph-19401', 'MG', 'Maria Gonzalez', 'F', '71y', '19401', 'es', '[{"code":"CBP","status":"Open","startDate":"09/15/2026"},{"code":"EED","status":"Open","startDate":"09/15/2026"},{"code":"KED","status":"Closed - Data","startDate":"09/15/2026"}]'::jsonb, null, null, '09/15/2026', 0, 0, null, null, '["pending","pending","pending"]'::jsonb, null, 'Active', '(626) 555-0111', '06/02/1955', 'Astrana IPA', 'HP-001', null, null, 'CA'),
  ('ph-19402', 'RT', 'Robert Tanaka', 'M', '68y', '19402', 'en', '[{"code":"COL","status":"Open","startDate":"09/15/2026"}]'::jsonb, 'Priya Natarajan', 'PN', '09/15/2026', 0, 0, null, null, '["pending","pending","pending"]'::jsonb, null, 'Active', '(213) 555-0133', '01/11/1958', 'Astrana IPA', 'HP-001', null, null, 'CA'),
  ('ph-19403', 'LW', 'Linda Washington', 'F', '74y', '19403', 'en', '[{"code":"CBP","status":"Open","startDate":"09/15/2026"},{"code":"EED","status":"Engaged","startDate":"09/15/2026"}]'::jsonb, 'Marcus Reyes', 'MR', '09/15/2026', 0, 0, null, null, '["pending","pending","pending"]'::jsonb, null, 'Active', '(562) 555-0150', '08/19/1952', 'Prospect Medical Group', 'HP-001', null, null, 'CA'),
  ('ph-19405', 'BK', 'Barbara Klein', 'F', '79y', '19405', 'en', '[{"code":"BCS","status":"Open","startDate":"09/15/2026"},{"code":"COA-M","status":"Open","startDate":"09/15/2026"},{"code":"CBP","status":"Engaged","startDate":"09/15/2026"},{"code":"OMW","status":"Open","startDate":"09/15/2026"}]'::jsonb, 'Marcus Reyes', 'MR', '09/15/2026', 0, 0, null, null, '["pending","pending","pending"]'::jsonb, null, 'Active', '(714) 555-0170', '04/14/1947', 'Prospect Medical Group', 'HP-001', null, null, 'CA'),
  ('ph-19407', 'SP', 'Sunita Patel', 'F', '67y', '19407', 'hi', '[{"code":"EED","status":"Open","startDate":"09/15/2026"}]'::jsonb, null, null, '09/15/2026', 0, 0, null, null, '["pending","pending","pending"]'::jsonb, null, 'Active', '(818) 555-0119', '02/03/1959', 'Astrana IPA', 'HP-001', null, null, 'CA'),
  ('ph-19408', 'TB', 'Thomas Brooks', 'M', '72y', '19408', 'en', '[{"code":"CBP","status":"Open","startDate":"09/15/2026"},{"code":"KED","status":"Open","startDate":"09/15/2026"}]'::jsonb, 'Marcus Reyes', 'MR', '09/15/2026', 0, 0, null, null, '["pending","pending","pending"]'::jsonb, null, 'Active', '(714) 555-0181', '07/09/1954', 'Prospect Medical Group', 'HP-001', null, null, 'CA'),
  ('ph-19409', 'AH', 'Angela Hughes', 'F', '69y', '19409', 'en', '[{"code":"BCS","status":"Completed","startDate":"09/15/2026"}]'::jsonb, 'Priya Natarajan', 'PN', '09/15/2026', 0, 0, null, null, '["pending","pending","pending"]'::jsonb, null, 'Active', '(626) 555-0166', '11/02/1956', 'Astrana IPA', 'HP-001', null, null, 'CA'),
  ('ph-19410', 'CR', 'Carlos Ramirez', 'M', '75y', '19410', 'es', '[{"code":"COL","status":"Open","startDate":"09/15/2026"},{"code":"CBP","status":"Open","startDate":"09/15/2026"}]'::jsonb, 'Marcus Reyes', 'MR', '09/15/2026', 0, 0, null, null, '["pending","pending","pending"]'::jsonb, null, 'Active', '(562) 555-0158', '05/21/1951', 'Prospect Medical Group', 'HP-001', null, null, 'CA')
) as v(id, initials, name, gender, age, member_id, language, gaps, assignee, assignee_initials,
  start_date, adv_illness, frailty, risk_level, tasks, outreach_dots, outreach_date,
  member_status, phone, dob, ipa, hp_code, zip, city, state)
join public.patient_registry as r on r.member_id = v.member_id
where not exists (select 1 from public.hedis_members as h where h.id = v.id);

-- ph- rows added earlier under the raw member id.
update public.hedis_members as h
set member_id = r.fold_id::text
from public.patient_registry as r
where h.id in ('ph-19401', 'ph-19402', 'ph-19403', 'ph-19405', 'ph-19407', 'ph-19408', 'ph-19409', 'ph-19410')
  and h.member_id in ('19401', '19402', '19403', '19404', '19405', '19406', '19407', '19408', '19409', '19410')
  and r.member_id = h.member_id;

commit;
