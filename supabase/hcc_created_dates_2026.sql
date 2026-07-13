-- HCC worklist — realistic 2026 Created Dates for the SLA / Overdue view.
--
-- Spreads every record's Created Date deterministically across the ~5 weeks
-- ending on today (2026-07-13). With the 14-day SLA window, this yields a
-- realistic mix: max overdue ≈ 3 weeks (35 elapsed − 14-day window), and the
-- newest records still within the SLA window. Ordering by id keeps the
-- result stable across re-runs. create_date is text "MM/DD/YYYY".
--
-- The clock starts at Support-Team receipt, which the worklist represents as
-- the Created Date. dos_list service dates are intentionally left untouched —
-- only the record-level Created Date moves.

WITH ordered AS (
  SELECT id,
         row_number() OVER (ORDER BY id) - 1 AS rn,
         count(*)     OVER ()                AS total
  FROM hcc_members
)
UPDATE hcc_members m
SET create_date = to_char(
      -- Postgres: subtract an INTERVAL from a DATE, not a raw integer.
      (DATE '2026-07-13' - ((o.rn * 35) / GREATEST(o.total - 1, 1)) * INTERVAL '1 day')::date,
      'MM/DD/YYYY'
    )
FROM ordered o
WHERE m.id = o.id;
