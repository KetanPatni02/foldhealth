-- Which Fold practice number an SMS used (thread header, "Received on" /
-- "Sent from" under each message, the Messages list indicator and filter).
--
--   comms_inboxes.label            Display label for an SMS line, e.g.
--                                  "AWV Line", "Main Clinic", "Location A"
--                                  (30 characters max). Empty: the inbox
--                                  name shows. Edited in Settings > Calls >
--                                  Phone Number by users allowed to manage
--                                  phone numbers.
--   org_settings.always_show_sms_line
--                                  "Always display incoming number in SMS
--                                  threads". Practices with more than one
--                                  SMS line always show it; this decides it
--                                  for single-number practices. On by default.
--
-- Messages record their own line (no new column): an inbound SMS keeps the
-- practice number in to_addr, an outbound one in from_addr, and the line's
-- label in meta.line_label, as they were when it was received or sent.
--
-- Additive and idempotent. Seed: sms_practice_line_seed.sql.
-- Ask Alok Kumar to run this migration, then the seed, on Supabase.

ALTER TABLE public.comms_inboxes ADD COLUMN IF NOT EXISTS label text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comms_inboxes_label_length') THEN
    ALTER TABLE public.comms_inboxes
      ADD CONSTRAINT comms_inboxes_label_length CHECK (label IS NULL OR char_length(label) <= 30);
  END IF;
END $$;

ALTER TABLE public.org_settings ADD COLUMN IF NOT EXISTS always_show_sms_line boolean NOT NULL DEFAULT true;

NOTIFY pgrst, 'reload schema';
