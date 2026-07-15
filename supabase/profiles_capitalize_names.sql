-- ============================================================
-- One-off backfill: profiles rows that start with a lowercase
-- first_name / last_name / full_name.
--
-- Matches the new client-side validation added in
-- src/features/settings/AccountPanel.jsx — every teammate's name
-- must begin with an uppercase letter. This just brings the
-- historical rows into compliance.
--
-- Only touches rows where the first character is a-z. Runs are
-- safe to repeat (idempotent).
-- ============================================================

-- Uppercase the first character of a string, leaving the rest
-- untouched. Preserves "McDonald", "O'Brien", etc. — unlike
-- INITCAP which lowercases everything after the first letter.
CREATE OR REPLACE FUNCTION cap_first(str text) RETURNS text AS $$
  SELECT CASE
    WHEN str IS NULL OR length(str) = 0 THEN str
    ELSE upper(substring(str FROM 1 FOR 1)) || substring(str FROM 2)
  END
$$ LANGUAGE sql IMMUTABLE;

UPDATE profiles
   SET first_name = cap_first(first_name)
 WHERE first_name ~ '^[a-z]';

UPDATE profiles
   SET last_name = cap_first(last_name)
 WHERE last_name ~ '^[a-z]';

-- full_name may be a free-form multi-word string ("abhay pratap
-- Chaudhary"). Capitalize every word's first letter so the whole
-- name reads correctly, then leave subsequent letters alone.
UPDATE profiles
   SET full_name = (
     SELECT string_agg(cap_first(word), ' ')
       FROM regexp_split_to_table(full_name, '\s+') AS word
   )
 WHERE full_name ~ '\y[a-z]';

-- Cleanup: drop the helper so we don't leave global objects behind.
DROP FUNCTION IF EXISTS cap_first(text);

-- Verify:
--   SELECT count(*) FROM profiles
--    WHERE first_name ~ '^[a-z]' OR last_name ~ '^[a-z]' OR full_name ~ '\y[a-z]';
--   -- Expected: 0.
