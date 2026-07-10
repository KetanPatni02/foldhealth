-- HCC worklist — realistic 2026 Created Dates for the SLA / Overdue view.
--
-- Spreads every record's Created Date deterministically across the ~5 weeks
-- ending 07/09/2026 (all before "today"), so the 14-day SLA window yields a
-- realistic mix of Overdue, Due-soon, and On-track records. Ordering by id
-- keeps the result stable across re-runs. create_date is text "MM/DD/YYYY".
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
      DATE '2026-07-09' - ((o.rn * 35) / GREATEST(o.total - 1, 1)),
      'MM/DD/YYYY'
    )
FROM ordered o
WHERE m.id = o.id;
