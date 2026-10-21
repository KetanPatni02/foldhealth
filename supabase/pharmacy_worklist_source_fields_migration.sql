-- Pharmacy worklist: fields the plan file sends per member, shown on the
-- HEDIS-style worklist.
--   source_priority  priority in the source's own format (P1/P2/P3 or
--                    High/Medium/Low); null means the worklist derives it.
--   other_care_gaps  the member's non-pharmacy care gaps:
--                    [{ code, name, status }]. Shown as a count with the list
--                    on hover, and filterable by count and by gap.
--
-- Per-gap status and start date live in the existing `measures` jsonb
-- (status / statusManual / startDate / claimFollowUpTask), so they need no
-- column.
--
-- Backfill: the 10 demo members (19401-19410) from
-- src/features/pharmacy-worklist/data/mock.js. pharmacy_worklist_members_seed.sql
-- and `bun run seed` are insert-only per person, so rows already in the table
-- only pick these values up from here.

begin;

alter table public.pharmacy_worklist_members
  add column if not exists source_priority text,
  add column if not exists other_care_gaps jsonb not null default '[]'::jsonb;

update public.pharmacy_worklist_members as m
set source_priority = v.source_priority,
    other_care_gaps = v.other_care_gaps
from (values
  ('19401', 'High',   '[{"code":"CBP","name":"Controlling Blood Pressure","status":"Open"},{"code":"EED","name":"Eye Exam for Patients With Diabetes","status":"Open"},{"code":"KED","name":"Kidney Health Evaluation","status":"Closed-Data"}]'::jsonb),
  ('19402', null,     '[{"code":"COL","name":"Colorectal Cancer Screening","status":"Open"}]'::jsonb),
  ('19403', null,     '[{"code":"CBP","name":"Controlling Blood Pressure","status":"Open"},{"code":"EED","name":"Eye Exam for Patients With Diabetes","status":"In Progress"}]'::jsonb),
  ('19404', 'Medium', '[]'::jsonb),
  ('19405', 'P1',     '[{"code":"BCS","name":"Breast Cancer Screening","status":"Open"},{"code":"COA-M","name":"Care for Older Adults: Medication Review","status":"Open"},{"code":"CBP","name":"Controlling Blood Pressure","status":"In Progress"},{"code":"OMW","name":"Osteoporosis Management in Women","status":"Open"}]'::jsonb),
  ('19406', null,     '[]'::jsonb),
  ('19407', null,     '[{"code":"EED","name":"Eye Exam for Patients With Diabetes","status":"Open"}]'::jsonb),
  ('19408', 'P2',     '[{"code":"CBP","name":"Controlling Blood Pressure","status":"Open"},{"code":"KED","name":"Kidney Health Evaluation","status":"Open"}]'::jsonb),
  ('19409', 'Low',    '[{"code":"BCS","name":"Breast Cancer Screening","status":"Completed"}]'::jsonb),
  ('19410', null,     '[{"code":"COL","name":"Colorectal Cancer Screening","status":"Open"},{"code":"CBP","name":"Controlling Blood Pressure","status":"Open"}]'::jsonb)
) as v(id, source_priority, other_care_gaps)
where m.id = v.id;

commit;
