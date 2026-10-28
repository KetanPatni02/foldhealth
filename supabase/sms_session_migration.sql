-- FCS-5677: a shared number's rest-of-today session. When staff log a
-- received SMS for a member with "This message and all upcoming messages to
-- be received today", later replies on that number go to the same member
-- until 11:59 PM, unless someone stops or switches it.
--   sms_session: { member_id, member_name, started_at, until }  (NULL = none)
--
-- The trigger assigns each new reply as it's saved, so it works whether or
-- not anyone has the thread open. It only fills in a reply that names no
-- one, and marks it meta.assigned_by = 'session' (a staff assignment is
-- 'staff'), which "all incoming messages after it" relies on.
--
-- Additive and idempotent: safe to run more than once. Needs the columns
-- from sms_member_attribution_migration.sql, so it adds them too (IF NOT
-- EXISTS). The app works before it runs (the session is kept in the browser
-- and applied while the thread is open).

ALTER TABLE public.patient_conversations
  ADD COLUMN IF NOT EXISTS sms_session jsonb;

ALTER TABLE public.patient_messages ADD COLUMN IF NOT EXISTS logged_for_patient_id text;
ALTER TABLE public.patient_messages ADD COLUMN IF NOT EXISTS logged_for_name text;

CREATE OR REPLACE FUNCTION public.comms_sms_session_assign()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  s jsonb;
BEGIN
  IF NEW.direction <> 'in' OR NEW.kind <> 'message' OR NEW.internal
     OR NEW.logged_for_patient_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT c.sms_session INTO s
    FROM public.patient_conversations c
   WHERE c.id = NEW.conversation_id AND c.channel = 'sms';
  IF s IS NULL OR s->>'member_id' IS NULL
     OR (s->>'until')::timestamptz <= now()
     OR coalesce(NEW.created_at, now()) < (s->>'started_at')::timestamptz THEN
    RETURN NEW;
  END IF;
  NEW.logged_for_patient_id := s->>'member_id';
  NEW.logged_for_name := s->>'member_name';
  NEW.meta := coalesce(NEW.meta, '{}'::jsonb) || jsonb_build_object('assigned_by', 'session');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comms_sms_session_assign ON public.patient_messages;
CREATE TRIGGER comms_sms_session_assign
  BEFORE INSERT ON public.patient_messages
  FOR EACH ROW EXECUTE FUNCTION public.comms_sms_session_assign();

NOTIFY pgrst, 'reload schema';
