-- CCM timer inactivity reminders: one row each time the timer asked "Are you
-- still working on this patient?", with when it showed, when the user
-- answered and what they chose. Supports billing review if a session's time
-- is questioned later.
--
-- action: continue | pause
-- dont_remind: the "Don't remind me again" box was ticked with that answer
-- (no more reminders that session).
-- session_id groups the reminders of one timer session (start to log or
-- reset); threshold_seconds is the inactivity threshold in effect then.
--
-- Read with the anon key, so the table needs a permissive policy.

CREATE TABLE IF NOT EXISTS public.timer_inactivity_events (
  id                 text PRIMARY KEY,
  session_id         text NOT NULL,
  patient_id         text NOT NULL,
  user_id            text,
  user_name          text,
  threshold_seconds  integer NOT NULL,
  elapsed_seconds    integer NOT NULL,
  shown_at           timestamptz NOT NULL,
  responded_at       timestamptz NOT NULL,
  action             text NOT NULL,
  dont_remind        boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS timer_inactivity_events_session_idx
  ON public.timer_inactivity_events (session_id, shown_at);
CREATE INDEX IF NOT EXISTS timer_inactivity_events_patient_idx
  ON public.timer_inactivity_events (patient_id, shown_at DESC);

ALTER TABLE public.timer_inactivity_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on timer_inactivity_events" ON public.timer_inactivity_events;
CREATE POLICY "Allow all on timer_inactivity_events" ON public.timer_inactivity_events
  FOR ALL USING (true) WITH CHECK (true);
