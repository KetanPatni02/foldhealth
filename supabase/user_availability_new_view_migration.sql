-- User Availability "New view": segments with no end date (they repeat
-- until stopped), and overlaps a user has allowed (they may double-book).

ALTER TABLE user_availability ADD COLUMN IF NOT EXISTS allow_overlap BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_availability ALTER COLUMN end_date DROP NOT NULL;

-- Saving a user's availability writes their changed slots and removes the
-- deleted ones together: one transaction, so a failed save changes nothing.
CREATE OR REPLACE FUNCTION public.save_user_availability(p_rows jsonb, p_remove text[] DEFAULT '{}')
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF coalesce(array_length(p_remove, 1), 0) > 0 THEN
    DELETE FROM public.user_availability WHERE id = ANY (p_remove);
  END IF;

  INSERT INTO public.user_availability (
    id, user_id, user_name, user_email, location, timezone, advanced, repeat,
    repeat_interval, days, weeks, start_date, end_date, slots, skip_holidays,
    allow_overlap, updated_at
  )
  SELECT
    r.id, r.user_id, r.user_name, r.user_email, r.location, r.timezone,
    coalesce(r.advanced, false), coalesce(r.repeat, 'weekly'), coalesce(r.repeat_interval, 1),
    coalesce(r.days, '{}'), coalesce(r.weeks, '{}'), r.start_date, r.end_date,
    coalesce(r.slots, '[]'::jsonb), coalesce(r.skip_holidays, true),
    coalesce(r.allow_overlap, false), coalesce(r.updated_at, now())
  FROM jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) AS r(
    id text, user_id text, user_name text, user_email text, location text, timezone text,
    advanced boolean, repeat text, repeat_interval integer, days integer[], weeks integer[],
    start_date date, end_date date, slots jsonb, skip_holidays boolean,
    allow_overlap boolean, updated_at timestamptz
  )
  ON CONFLICT (id) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    user_name = EXCLUDED.user_name,
    user_email = EXCLUDED.user_email,
    location = EXCLUDED.location,
    timezone = EXCLUDED.timezone,
    advanced = EXCLUDED.advanced,
    repeat = EXCLUDED.repeat,
    repeat_interval = EXCLUDED.repeat_interval,
    days = EXCLUDED.days,
    weeks = EXCLUDED.weeks,
    start_date = EXCLUDED.start_date,
    end_date = EXCLUDED.end_date,
    slots = EXCLUDED.slots,
    skip_holidays = EXCLUDED.skip_holidays,
    allow_overlap = EXCLUDED.allow_overlap,
    updated_at = EXCLUDED.updated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_user_availability(jsonb, text[]) TO authenticated;
