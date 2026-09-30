-- Out of Office records (Preferences → Out of Office, the calendar, and the
-- OOO drawers in Settings → Calendar / Settings → Account → Users).
--
-- One row per period a user is away. The user is matched by name, the same
-- key appointments use for their provider (appointments.primary_user);
-- user_id is kept when known. Status (Upcoming / Ongoing / Past) is worked
-- out from start_at / end_at, so it isn't stored.
--
-- Shared by every signed-in user; anon gets no access.

CREATE TABLE IF NOT EXISTS public.ooo_records (
  id                  text PRIMARY KEY,
  user_id             text,
  user_name           text NOT NULL,
  user_email          text,
  user_role           text,
  start_at            timestamptz NOT NULL,
  end_at              timestamptz NOT NULL,
  reason              text NOT NULL DEFAULT '',
  auto_reply          boolean NOT NULL DEFAULT false,
  auto_reply_message  text NOT NULL DEFAULT '',
  created_by          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ooo_records_dates_check CHECK (end_at > start_at)
);
CREATE INDEX IF NOT EXISTS ooo_records_user_idx ON public.ooo_records (lower(user_name));
CREATE INDEX IF NOT EXISTS ooo_records_range_idx ON public.ooo_records (start_at, end_at);
ALTER TABLE public.ooo_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on ooo_records" ON public.ooo_records;
CREATE POLICY "Allow all on ooo_records" ON public.ooo_records
  FOR ALL TO authenticated
  USING ((select auth.uid()) is not null) WITH CHECK ((select auth.uid()) is not null);
