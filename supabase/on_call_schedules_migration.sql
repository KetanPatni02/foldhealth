-- On call schedules (the Create Schedule drawer, opened from the Out of
-- Office record drawer's "+ On Call Schedule").
--
-- One row per schedule: who is on call for a phone tree type (Holiday Hours
-- or Out of Office) between two dates, on the chosen weekdays (0 = Sunday
-- … 6 = Saturday). The user is matched by name, as appointments and
-- ooo_records do; user_id is kept when known. ooo_record_id links a
-- schedule made from an Out of Office record.
--
-- Shared by every signed-in user; anon gets no access (as ooo_records).

CREATE TABLE IF NOT EXISTS public.on_call_schedules (
  id               text PRIMARY KEY,
  name             text NOT NULL,
  phone_tree_type  text NOT NULL,
  from_date        date NOT NULL,
  to_date          date NOT NULL,
  days             integer[] NOT NULL DEFAULT '{}',
  user_name        text NOT NULL,
  user_id          text,
  ooo_record_id    text,
  created_by       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT on_call_schedules_dates_check CHECK (to_date >= from_date),
  CONSTRAINT on_call_schedules_type_check CHECK (phone_tree_type IN ('Holiday Hours', 'Out of Office'))
);
CREATE INDEX IF NOT EXISTS on_call_schedules_user_idx ON public.on_call_schedules (lower(user_name));
CREATE INDEX IF NOT EXISTS on_call_schedules_ooo_idx ON public.on_call_schedules (ooo_record_id);
ALTER TABLE public.on_call_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on on_call_schedules" ON public.on_call_schedules;
CREATE POLICY "Allow all on on_call_schedules" ON public.on_call_schedules
  FOR ALL TO authenticated
  USING ((select auth.uid()) is not null) WITH CHECK ((select auth.uid()) is not null);
