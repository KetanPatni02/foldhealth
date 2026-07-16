-- hcc_diag_comment_scope_migration.sql
--
-- Adds ICD/DOS scope columns to hcc_diag_comments so a comment in the
-- DiagPanel Comments tab can show "for which ICD / which DOS" it was posted
-- against. Older rows without these columns simply come back as null; the
-- CommentEntry UI hides the ICD/DOS chip when null.

ALTER TABLE hcc_diag_comments ADD COLUMN IF NOT EXISTS icd TEXT;
ALTER TABLE hcc_diag_comments ADD COLUMN IF NOT EXISTS dos TEXT;

-- Backfill the three seeded rows with representative scope values that match
-- their body text (E11.21 → progress note DOS 04/18/2026; I50.9 → 03/08/2026;
-- I48.91 → 03/08/2026). Safe to re-run; only touches the seed IDs.
UPDATE hcc_diag_comments SET icd = 'E11.21', dos = '04/18/2026' WHERE id = 'c1' AND icd IS NULL;
UPDATE hcc_diag_comments SET icd = 'I50.9',  dos = '03/08/2026' WHERE id = 'c2' AND icd IS NULL;
UPDATE hcc_diag_comments SET icd = 'I48.91', dos = '03/08/2026' WHERE id = 'c3' AND icd IS NULL;
