-- Employer Impact Report (Analytics → Overview).
--
-- Every chart on the report is a view of one fact table: a number, for one
-- employer, patient location, visit location and month, under a metric
-- ("active_members"), a series ("spouse") and a bucket (the x category when
-- it isn't the month: a weekday, an hour, a medication name). The report's
-- filters (employer, location, date range) narrow the rows; the SQL function
-- below sums what's left so the browser gets one small JSON document back
-- instead of tens of thousands of rows (PostgREST caps a response at 1,000).
--
-- Read with the anon key, so both tables need a permissive policy.

CREATE TABLE IF NOT EXISTS public.employer_impact_employers (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0
);
ALTER TABLE public.employer_impact_employers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on employer_impact_employers" ON public.employer_impact_employers;
CREATE POLICY "Allow all on employer_impact_employers" ON public.employer_impact_employers
  FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.employer_impact_metrics (
  id                text PRIMARY KEY,       -- employer|patient_loc|visit_loc|month|metric|series|bucket
  employer_id       text NOT NULL REFERENCES public.employer_impact_employers (id) ON DELETE CASCADE,
  patient_location  text NOT NULL,          -- where the member lives
  visit_location    text NOT NULL,          -- where care was delivered
  month             date NOT NULL,          -- first day of the month
  metric            text NOT NULL,
  series            text NOT NULL,
  bucket            text NOT NULL DEFAULT '',
  value             numeric NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS employer_impact_metrics_filter_idx
  ON public.employer_impact_metrics (month, employer_id);
ALTER TABLE public.employer_impact_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on employer_impact_metrics" ON public.employer_impact_metrics;
CREATE POLICY "Allow all on employer_impact_metrics" ON public.employer_impact_metrics
  FOR ALL USING (true) WITH CHECK (true);

-- The report's data for one set of filters, combined by metric / series /
-- bucket / month. NULL employer or location means "all".
--
-- Values add up across employers and locations, except extremes: a series
-- named exactly max / min keeps the largest / smallest value (the longest
-- visit across two clinics is not their two longest visits added).
CREATE OR REPLACE FUNCTION public.employer_impact_rollup(
  p_from            date,
  p_to              date,
  p_employer        text DEFAULT NULL,
  p_location_scope  text DEFAULT 'patient',
  p_location        text DEFAULT NULL
) RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'm', metric, 's', series, 'b', bucket, 'mo', to_char(month, 'YYYY-MM'), 'v', v
         )), '[]'::jsonb)
  FROM (
    SELECT metric, series, bucket, month,
           CASE WHEN series = 'max' THEN MAX(value)
                WHEN series = 'min' THEN MIN(value)
                ELSE SUM(value) END AS v
    FROM public.employer_impact_metrics
    WHERE month BETWEEN date_trunc('month', p_from)::date AND date_trunc('month', p_to)::date
      AND (p_employer IS NULL OR employer_id = p_employer)
      AND (p_location IS NULL OR
           (CASE WHEN p_location_scope = 'visit' THEN visit_location ELSE patient_location END) = p_location)
    GROUP BY metric, series, bucket, month
  ) t;
$$;

-- What the filter bar can offer: employers, the locations under each scope,
-- and the span of months that have data.
CREATE OR REPLACE FUNCTION public.employer_impact_filters()
RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'employers', (SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'name', name) ORDER BY sort_order, name), '[]'::jsonb)
                  FROM public.employer_impact_employers),
    'patientLocations', (SELECT COALESCE(jsonb_agg(DISTINCT patient_location), '[]'::jsonb) FROM public.employer_impact_metrics),
    'visitLocations',   (SELECT COALESCE(jsonb_agg(DISTINCT visit_location), '[]'::jsonb) FROM public.employer_impact_metrics),
    'firstMonth', (SELECT to_char(MIN(month), 'YYYY-MM') FROM public.employer_impact_metrics),
    'lastMonth',  (SELECT to_char(MAX(month), 'YYYY-MM') FROM public.employer_impact_metrics)
  );
$$;

GRANT EXECUTE ON FUNCTION public.employer_impact_rollup(date, date, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.employer_impact_filters() TO anon, authenticated;
