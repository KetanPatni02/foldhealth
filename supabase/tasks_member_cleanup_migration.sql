-- ============================================================
-- Tasks: clean up "member" placeholder values
-- ============================================================
-- A task is always for a single patient — never "Multiple Patients"
-- or "New Admissions". Replace any legacy seed values with a real
-- patient name picked from the patients table per row, so clicking
-- the member opens the real patient profile drawer.
--
-- Idempotent: only updates rows whose member matches one of the
-- placeholder strings.

UPDATE tasks t
   SET member = sub.name
  FROM (
    SELECT t2.id AS task_id, p.name
      FROM tasks t2
      CROSS JOIN LATERAL (
        SELECT name
          FROM patients
         WHERE name IS NOT NULL AND name <> ''
         ORDER BY md5(random()::text || t2.id::text)
         LIMIT 1
      ) AS p
     WHERE t2.member IN ('Multiple Patients', 'New Admissions')
  ) AS sub
 WHERE t.id = sub.task_id;

-- Same per-row randomization trick as tasks_reassign_and_redate:
-- the md5(random() || t2.id) hash forces the planner to evaluate the
-- subquery once per outer row, so each task gets an independent pick
-- instead of the entire batch sharing one name.
