-- ============================================================
-- Tasks: bulk reassign + redate to current year
-- ============================================================
-- Two one-shot data fixes after the assignee-id migration:
--
-- (4) Replace any assigned_to where the FK is null (most importantly
--     the seed rows assigned to "Dr. JeDee Potter") with a random
--     profile from profiles, and stamp the matching assigned_to_id
--     FK at the same time. Tasks that already have a valid FK are
--     left alone.
--
-- (5) Move every due_date that lives in a past year (2020–2025) into
--     2026 so the demo data isn't perpetually overdue. due_date is a
--     TEXT column formatted MM-DD-YYYY, not a real date type, so the
--     rewrite is a string slice.
--
-- Both statements are idempotent — running them twice is a no-op
-- because the WHERE filters exclude rows that already have the
-- desired shape.


-- ── (4) Reassign rows where the FK is null ─────────────────────────
-- The CROSS JOIN LATERAL re-evaluates the random() subquery once per
-- outer row, so every task gets an independent random profile rather
-- than every task receiving the same single profile (which is what
-- happens with a non-LATERAL subquery in PostgreSQL).

UPDATE tasks t
   SET assigned_to    = sub.full_name,
       assigned_to_id = sub.id
  FROM (
    SELECT t2.id AS task_id,
           p.id,
           p.full_name
      FROM tasks t2
      CROSS JOIN LATERAL (
        SELECT id, full_name
          FROM profiles
         WHERE full_name IS NOT NULL AND full_name <> ''
         ORDER BY random()
         LIMIT 1
      ) AS p
     WHERE t2.assigned_to_id IS NULL
  ) AS sub
 WHERE t.id = sub.task_id;


-- ── (5) Redate any past-year due_date to 2026 ─────────────────────
-- due_date format is MM-DD-YYYY. We swap the trailing year if it's
-- 2020–2025 for 2026, leaving days/months untouched.

UPDATE tasks
   SET due_date = substring(due_date FROM 1 FOR 6) || '2026'
 WHERE due_date IS NOT NULL
   AND length(due_date) = 10
   AND substring(due_date FROM 7 FOR 4) ~ '^20[0-2][0-5]$';

-- After running, the app's auto-missed normalization runs on each
-- fetch: tasks whose new 2026 date is still in the past land in
-- Missed, tasks whose new date is in the future show as Pending.
