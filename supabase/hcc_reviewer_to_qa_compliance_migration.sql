-- Rename the HCC review roles across all seeded data:
--   "Reviewer 1" / "Reviewer"  → "QA"
--   "Reviewer 2"               → "Compliance"
--
-- The internal role KEYS in the app (reviewer / reviewer2, r1 / r2) are
-- unchanged — this only renames the human-readable labels that were seeded
-- into the database. Idempotent (uses REPLACE / equality guards), so it is
-- safe to re-run.

-- 1) hcc_diagnosis_gaps.last_activity_by — e.g. "B. Olafson (Reviewer 1)" or
--    the older bare "E. Fortier (Reviewer)". "(Reviewer 2)" is handled first
--    so it is never mangled into "(QA 2)".
UPDATE hcc_diagnosis_gaps
   SET last_activity_by = REPLACE(last_activity_by, '(Reviewer 2)', '(Compliance)')
 WHERE last_activity_by LIKE '%(Reviewer 2)%';

UPDATE hcc_diagnosis_gaps
   SET last_activity_by = REPLACE(last_activity_by, '(Reviewer 1)', '(QA)')
 WHERE last_activity_by LIKE '%(Reviewer 1)%';

UPDATE hcc_diagnosis_gaps
   SET last_activity_by = REPLACE(last_activity_by, '(Reviewer)', '(QA)')
 WHERE last_activity_by LIKE '%(Reviewer)%';

-- 2) hcc_diag_comments.role — exact-match role labels.
UPDATE hcc_diag_comments SET role = 'QA'         WHERE role IN ('Reviewer', 'Reviewer 1');
UPDATE hcc_diag_comments SET role = 'Compliance' WHERE role = 'Reviewer 2';

-- 3) care_teams — team_type, display name, and the members JSON blob.
--    "Reviewer 1 Team" → "QA Team", team_type "Reviewer 1" → "QA",
--    and every members[].roles == "Reviewer 1" → "QA".
UPDATE care_teams
   SET name       = REPLACE(name, 'Reviewer 1', 'QA'),
       team_type  = REPLACE(team_type, 'Reviewer 1', 'QA'),
       members    = REPLACE(members::text, 'Reviewer 1', 'QA')::jsonb
 WHERE name LIKE '%Reviewer 1%'
    OR team_type LIKE '%Reviewer 1%'
    OR members::text LIKE '%Reviewer 1%';

UPDATE care_teams
   SET name       = REPLACE(name, 'Reviewer 2', 'Compliance'),
       team_type  = REPLACE(team_type, 'Reviewer 2', 'Compliance'),
       members    = REPLACE(members::text, 'Reviewer 2', 'Compliance')::jsonb
 WHERE name LIKE '%Reviewer 2%'
    OR team_type LIKE '%Reviewer 2%'
    OR members::text LIKE '%Reviewer 2%';
