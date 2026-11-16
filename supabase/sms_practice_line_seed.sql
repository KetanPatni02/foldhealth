-- Seed for sms_practice_line_migration.sql. Run the migration first.
--
-- 1. Display labels for the two sample SMS lines (only where none is set).
-- 2. Existing SMS texts get the line they came in on or went out from, taken
--    from their conversation's inbox (the best record there is for messages
--    saved before lines were recorded). Only empty fields are filled, so
--    re-running changes nothing and real recorded lines are never touched.
--
-- Ask Alok Kumar to run this seed on Supabase.

BEGIN;

UPDATE public.comms_inboxes SET label = 'Main Clinic Line'
 WHERE id = 'inbox-sms-main' AND coalesce(label, '') = '';
UPDATE public.comms_inboxes SET label = 'CCM Program Line'
 WHERE id = 'inbox-sms-care' AND coalesce(label, '') = '';

-- Inbound: the practice number they were sent to.
UPDATE public.patient_messages m
   SET to_addr = i.address,
       meta = coalesce(m.meta, '{}'::jsonb) || jsonb_build_object('line_label', coalesce(nullif(i.label, ''), i.name))
  FROM public.patient_conversations c
  JOIN public.comms_inboxes i ON i.id = c.inbox_id AND i.channel = 'sms'
 WHERE m.conversation_id = c.id AND c.channel = 'sms'
   AND m.kind = 'message' AND NOT coalesce(m.internal, false)
   AND m.direction = 'in' AND coalesce(m.to_addr, '') = '';

-- Outbound: the practice number they were sent from.
UPDATE public.patient_messages m
   SET from_addr = i.address,
       meta = coalesce(m.meta, '{}'::jsonb) || jsonb_build_object('line_label', coalesce(nullif(i.label, ''), i.name))
  FROM public.patient_conversations c
  JOIN public.comms_inboxes i ON i.id = c.inbox_id AND i.channel = 'sms'
 WHERE m.conversation_id = c.id AND c.channel = 'sms'
   AND m.kind = 'message' AND NOT coalesce(m.internal, false)
   AND m.direction = 'out' AND coalesce(m.from_addr, '') = '';

COMMIT;
