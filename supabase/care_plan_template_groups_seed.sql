-- Example template groups for Care Plan Library > Template Groups
-- (care_plan_template_groups migration). Each bundles library templates a
-- care manager often applies together. Members are the seeded library
-- templates (scripts/seed.js, CARE_PLAN_TEMPLATE_LIBRARY), so the ids are the
-- same on every database; a member missing here is dropped, not left dangling.
--
-- Two groups start at version 2, with version 1 holding fewer members, so a
-- plan that used version 1 shows the "group has new templates" offer.
--
-- Idempotent: fixed group ids, upserted.

WITH seed(id, name, description, versions) AS (
  VALUES
  ('7c1e0a01-0000-4000-8000-000000000001'::uuid, 'Cardiometabolic Bundle',
   'Diabetes, blood pressure, cholesterol and weight, with medication adherence. For members with two or more cardiometabolic conditions.',
   jsonb_build_array(
     jsonb_build_array('bd9f4e6f-a29a-5802-9f8f-6a30ae61a5d7', 'b78f9eae-9cf5-53d9-af94-587cb5f559a2', '144822a6-7ecb-5038-bf67-0809e2660ff2'),
     jsonb_build_array('bd9f4e6f-a29a-5802-9f8f-6a30ae61a5d7', 'b78f9eae-9cf5-53d9-af94-587cb5f559a2', '144822a6-7ecb-5038-bf67-0809e2660ff2', 'd0183a6e-f58d-566a-be80-a4323f70528b', '82276ef9-d889-5f28-9873-d67a89326465'))),
  ('7c1e0a01-0000-4000-8000-000000000002'::uuid, 'Heart Failure Post-Discharge',
   'First 30 days after a heart failure admission: follow-up visit, med reconciliation, daily weights and readmission risk.',
   jsonb_build_array(
     jsonb_build_array('732c4978-906a-5311-9d63-fb8fd6019936', 'a9ced5ae-c094-5bbd-85ff-a23c247f8332', '59f08784-e7e5-54be-8eb9-459a484fad2c', 'c7a1b51b-cc4f-5cba-b47a-b71ef976f0b0'))),
  ('7c1e0a01-0000-4000-8000-000000000003'::uuid, 'Transitions of Care',
   'Hospital or SNF discharge: TOC outreach, medication reconciliation, follow-up appointment and readmission prevention.',
   jsonb_build_array(
     jsonb_build_array('d8d1b928-660f-55d0-9e34-01ecd1fa0a2b', '59f08784-e7e5-54be-8eb9-459a484fad2c', '732c4978-906a-5311-9d63-fb8fd6019936'),
     jsonb_build_array('d8d1b928-660f-55d0-9e34-01ecd1fa0a2b', '59f08784-e7e5-54be-8eb9-459a484fad2c', '732c4978-906a-5311-9d63-fb8fd6019936', 'c7a1b51b-cc4f-5cba-b47a-b71ef976f0b0', '65be049b-a433-54fa-8563-9448c542d096'))),
  ('7c1e0a01-0000-4000-8000-000000000004'::uuid, 'CKD with Diabetes',
   'Kidney disease alongside diabetes and blood pressure, with medication adherence.',
   jsonb_build_array(
     jsonb_build_array('b5d440e0-c574-5963-be30-eaa1122ecab0', 'bd9f4e6f-a29a-5802-9f8f-6a30ae61a5d7', 'b78f9eae-9cf5-53d9-af94-587cb5f559a2', '82276ef9-d889-5f28-9873-d67a89326465'))),
  ('7c1e0a01-0000-4000-8000-000000000005'::uuid, 'COPD and Respiratory',
   'COPD control with smoking cessation and flu and pneumonia vaccines.',
   jsonb_build_array(
     jsonb_build_array('2694b3ca-ba88-5a1f-b769-d46e6655c2d3', 'ab712502-b1f8-5517-b534-ba054a9af46f', '947939f2-549c-5bdf-9027-8eca0843ad2b', '82276ef9-d889-5f28-9873-d67a89326465'))),
  ('7c1e0a01-0000-4000-8000-000000000006'::uuid, 'Fall Prevention (Older Adults)',
   'Fall risk, home safety, medication review, equipment and vision or hearing support.',
   jsonb_build_array(
     jsonb_build_array('0142baa6-466b-5dc8-afb0-a93df8f6470b', '68c8d320-7d10-57c7-b16d-35cd1aa2d830', 'c1f51e64-9f18-561b-8f0c-2c51127d85a5', '101936b9-d6d7-539a-9e98-9dbe99b3149f', '3992f05c-f253-5c1e-aab5-b2125b4b3b93'))),
  ('7c1e0a01-0000-4000-8000-000000000007'::uuid, 'Annual Wellness Visit',
   'AWV prep: wellness and prevention, screenings, immunizations and advance directives.',
   jsonb_build_array(
     jsonb_build_array('473b1e46-9b35-5d20-bb76-5644707c29d5', '1dc75d5d-d9f3-5e4e-a23c-b1f80851a1d5', '947939f2-549c-5bdf-9027-8eca0843ad2b', '53d50ec5-1556-588c-b9c4-c48c191654f6'))),
  ('7c1e0a01-0000-4000-8000-000000000008'::uuid, 'Social Needs (SDOH)',
   'Housing, food, transportation and social isolation, for members with a positive SDOH screen.',
   jsonb_build_array(
     jsonb_build_array('b53f8af8-2954-5d47-bc70-08d33cc2eaf9', 'ca767e1d-f2b6-5d8f-a289-69b1e673f80b', '87349ed3-9378-59c1-9bb0-982429896b5c', '81fc0866-5e2a-5a40-a2d6-d8176e820d6e', 'edf2e218-6042-59a9-a635-41a39a4f5c12'))),
  ('7c1e0a01-0000-4000-8000-000000000009'::uuid, 'Behavioral Health Integration',
   'Behavioral health support with sleep, social connection and medication adherence.',
   jsonb_build_array(
     jsonb_build_array('1616a883-bf00-5444-adef-cacd57535354', '24198c38-1c57-5412-942e-2fd339214350', 'edf2e218-6042-59a9-a635-41a39a4f5c12', '82276ef9-d889-5f28-9873-d67a89326465'))),
  ('7c1e0a01-0000-4000-8000-00000000000a'::uuid, 'Dementia and Caregiver Support',
   'Cognitive decline with caregiver support, home safety and advance care planning.',
   jsonb_build_array(
     jsonb_build_array('4fab010e-fb9d-5b88-a239-97daec269dd3', 'a2f88024-8b14-5302-9daa-620ac7578621', '68c8d320-7d10-57c7-b16d-35cd1aa2d830', '53d50ec5-1556-588c-b9c4-c48c191654f6'))),
  ('7c1e0a01-0000-4000-8000-00000000000b'::uuid, 'Post-Stroke Recovery',
   'Recovery after a stroke: rehab, blood pressure, fall risk and help with daily activities.',
   jsonb_build_array(
     jsonb_build_array('73942463-4ebb-5d55-8ddb-9a5f2d29ced0', 'b78f9eae-9cf5-53d9-af94-587cb5f559a2', '0142baa6-466b-5dc8-afb0-a93df8f6470b', '0f0a9672-7fc0-54f9-8b88-3ace6a376067')))
),
-- Each version's members, keeping only templates that exist, in order.
v AS (
  SELECT s.id AS group_id, s.name, s.description, ver.n::int AS version_number,
         count(*) OVER (PARTITION BY s.id) AS latest,
         ARRAY(SELECT m.tid::uuid FROM jsonb_array_elements_text(ver.members) WITH ORDINALITY m(tid, ord)
               WHERE EXISTS (SELECT 1 FROM public.care_plan_templates t WHERE t.id = m.tid::uuid)
               ORDER BY m.ord) AS template_ids
  FROM seed s, jsonb_array_elements(s.versions) WITH ORDINALITY ver(members, n)
),
g AS (
  INSERT INTO public.care_plan_template_groups (id, name, description, template_ids, version_number, created_by, updated_by)
  SELECT group_id, name, description, template_ids, version_number, 'Alok Kumar', 'Alok Kumar'
  FROM v WHERE version_number = latest
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, description = EXCLUDED.description, template_ids = EXCLUDED.template_ids,
    version_number = EXCLUDED.version_number, updated_by = EXCLUDED.updated_by, updated_at = now()
  RETURNING id
)
INSERT INTO public.care_plan_template_group_versions (group_id, version_number, template_ids, published_by)
SELECT v.group_id, v.version_number, v.template_ids, 'Alok Kumar'
FROM v JOIN g ON g.id = v.group_id
ON CONFLICT (group_id, version_number) DO UPDATE SET template_ids = EXCLUDED.template_ids;
