-- HCC Outreach log (Astrana): every outreach logged from the HCC chart's
-- Outreach tab, for the Member or the PCP. Outreach is member-level, not
-- tied to a DOS, so the tab lists every row for the member.
--
--   hccs          HCC gaps the outreach was for, full names
--                 ("HCC 37 - Diabetes with Chronic Complications");
--                 empty for a Member Outreach
--   call_details  { direction, via, to, callType, durationMin, transcript[] }
--                 when the outreach was a call
--   snooze_until  MM/DD/YYYY picked from the form's Snooze action
--
-- Read with the anon key like the other HCC tables, so RLS allows all.

CREATE TABLE IF NOT EXISTS public.hcc_outreach_logs (
  id            text PRIMARY KEY,
  member_id     text,
  member_name   text NOT NULL,
  log_date      date NOT NULL,
  log_time      text NOT NULL DEFAULT '',
  type          text NOT NULL DEFAULT 'Call',
  title         text NOT NULL DEFAULT '',
  author        text NOT NULL DEFAULT '',
  hccs          text[] NOT NULL DEFAULT '{}',
  outcome       text,
  outcomes      text[] NOT NULL DEFAULT '{}',
  outcome_color text,
  note          text NOT NULL DEFAULT '',
  call_details  jsonb,
  snooze_until  text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hcc_outreach_logs_member_idx
  ON public.hcc_outreach_logs (member_name, log_date DESC);

ALTER TABLE public.hcc_outreach_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.hcc_outreach_logs;
CREATE POLICY "Allow all" ON public.hcc_outreach_logs FOR ALL USING (true) WITH CHECK (true);
