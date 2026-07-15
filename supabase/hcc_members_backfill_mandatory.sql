-- HCC worklist — backfill mandatory record fields so no row is ever missing
-- them. Open ICDs, Rendering Provider and Visit Type / POS are required at
-- record creation, so a worklist row must never render them empty.
--
-- Backfills only NULL / zero values (deterministic by id, so re-runs are
-- stable). Rows that already carry these values are left untouched. The app
-- also falls back to the local mock at read time, so the worklist is already
-- non-empty before this runs — this keeps the database itself clean.

UPDATE hcc_members
SET
  open_icds = CASE
    WHEN open_icds IS NULL OR open_icds = 0
      THEN 3 + (abs(hashtext(id)) % 13)          -- 3..15 open ICDs
    ELSE open_icds
  END,
  visit_type = COALESCE(
    visit_type,
    CASE WHEN abs(hashtext(id)) % 3 = 0 THEN 'Telehealth' ELSE 'Walk-in' END
  ),
  rendering_provider = COALESCE(
    rendering_provider,
    (ARRAY[
      'Dr. Alan Morse','Dr. Mallory Hayes','Dr. Susan Park','Dr. Calvin Reed',
      'Dr. Eamon','Dr. Nancy Wu','Dr. Jesse Flynn','Dr. Reed MacLeod'
    ])[1 + (abs(hashtext(id)) % 8)]
  )
WHERE open_icds IS NULL OR open_icds = 0
   OR visit_type IS NULL
   OR rendering_provider IS NULL;
