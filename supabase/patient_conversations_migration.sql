-- Comms: every conversation staff have with a patient, on any channel, and
-- the messages in it. Messages > Chat / SMS / Calls / Email read these.
-- (Staff-to-staff chat stays on direct_messages, shown as Internal Chat.)
--
-- patient_conversations.channel: chat | sms | call | email
-- patient_messages.kind:         message | call | email | note
-- patient_messages.direction:    out (staff to patient) | in (patient to staff)
-- patient_messages.status:       draft | queued | sent | delivered | read | failed
--
-- A chat conversation has a patient_token: the patient opens
-- /#/p/<patient_token> (no sign-in) to read and answer it, and to take
-- browser calls. Both tables are for signed-in staff only; the patient page
-- goes through the three comms_patient_* functions at the bottom, which only
-- ever touch the one chat conversation whose token they are given. (Calls
-- signal over a Realtime broadcast channel named after the token and don't
-- use these tables.) There is no seed: every row is a real conversation.

CREATE TABLE IF NOT EXISTS public.patient_conversations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel          text NOT NULL,
  patient_id       text,
  patient_name     text NOT NULL DEFAULT '',
  patient_email    text,
  patient_phone    text,
  group_name       text,
  subject          text,
  patient_token    text UNIQUE,
  assigned_to      text,
  sticky_note      text,
  members          jsonb NOT NULL DEFAULT '[]'::jsonb,
  starred          boolean NOT NULL DEFAULT false,
  archived         boolean NOT NULL DEFAULT false,
  pinned           boolean NOT NULL DEFAULT false,
  unread_count     integer NOT NULL DEFAULT 0,
  last_preview     text NOT NULL DEFAULT '',
  last_message_at  timestamptz NOT NULL DEFAULT now(),
  created_by       uuid,
  created_by_name  text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_conversations_channel_idx
  ON public.patient_conversations (channel, last_message_at DESC);
CREATE INDEX IF NOT EXISTS patient_conversations_patient_idx
  ON public.patient_conversations (patient_id);

CREATE TABLE IF NOT EXISTS public.patient_messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid NOT NULL REFERENCES public.patient_conversations(id) ON DELETE CASCADE,
  kind             text NOT NULL DEFAULT 'message',
  direction        text NOT NULL DEFAULT 'out',
  internal         boolean NOT NULL DEFAULT false,
  sender_id        uuid,
  sender_name      text NOT NULL DEFAULT '',
  body             text NOT NULL DEFAULT '',
  html             text,
  subject          text,
  from_addr        text,
  to_addr          text,
  cc               text,
  bcc              text,
  status           text NOT NULL DEFAULT 'sent',
  failure_reason   text,
  provider_id      text,
  meta             jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_messages_conversation_idx
  ON public.patient_messages (conversation_id, created_at);
-- Inbound SMS are pulled from the gateway on a poll; the provider id keeps a
-- message from landing twice (NULLs never collide, so other rows are free).
CREATE UNIQUE INDEX IF NOT EXISTS patient_messages_provider_idx
  ON public.patient_messages (provider_id);

ALTER TABLE public.patient_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on patient_conversations" ON public.patient_conversations;
CREATE POLICY "Allow all on patient_conversations" ON public.patient_conversations
  FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL) WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Allow all on patient_messages" ON public.patient_messages;
CREATE POLICY "Allow all on patient_messages" ON public.patient_messages
  FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL) WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Realtime: new messages show up live for staff. RLS applies to Realtime too,
-- so the signed-out patient page polls comms_patient_thread instead.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_conversations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── The patient page (signed out) ───────────────────────────────────────────
-- Everything the page at /#/p/<token> may do, each limited to the one chat
-- conversation with that token. SECURITY DEFINER so they work without a
-- session; they return only what the page shows (no staff-only fields,
-- internal notes, drafts, calls or emails). Tokens are 20 random hex
-- characters; anything shorter than 16 matches nothing.

CREATE OR REPLACE FUNCTION public.comms_patient_thread(p_token text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  c public.patient_conversations;
BEGIN
  IF length(coalesce(p_token, '')) < 16 THEN RETURN NULL; END IF;
  SELECT * INTO c FROM public.patient_conversations
   WHERE channel = 'chat' AND patient_token = p_token;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'conversation', jsonb_build_object(
      'id', c.id,
      'patient_token', c.patient_token,
      'patient_name', c.patient_name,
      'group_name', c.group_name,
      'last_preview', c.last_preview,
      'members', COALESCE((
        SELECT jsonb_agg(jsonb_build_object('name', mem->>'name'))
          FROM jsonb_array_elements(CASE WHEN jsonb_typeof(c.members) = 'array' THEN c.members ELSE '[]'::jsonb END) mem
         WHERE mem->>'name' IS NOT NULL), '[]'::jsonb)),
    'messages', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', m.id, 'kind', m.kind, 'direction', m.direction,
               'sender_name', m.sender_name, 'body', m.body,
               'meta', CASE WHEN m.meta ? 'attachment'
                            THEN jsonb_build_object('attachment', m.meta->'attachment')
                            ELSE '{}'::jsonb END,
               'status', m.status, 'read_at', m.read_at, 'created_at', m.created_at,
               'internal', false)
             ORDER BY m.created_at)
        FROM public.patient_messages m
       WHERE m.conversation_id = c.id AND m.kind = 'message'
         AND NOT m.internal AND m.status <> 'draft'), '[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.comms_patient_send(p_token text, p_body text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  c public.patient_conversations;
  m public.patient_messages;
  b text := btrim(coalesce(p_body, ''));
BEGIN
  IF b = '' OR length(b) > 4000 THEN
    RAISE EXCEPTION 'A message must be 1 to 4000 characters.' USING ERRCODE = '22023';
  END IF;
  IF length(coalesce(p_token, '')) < 16 THEN
    RAISE EXCEPTION 'This link is no longer active.' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO c FROM public.patient_conversations
   WHERE channel = 'chat' AND patient_token = p_token
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This link is no longer active.' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.patient_messages (conversation_id, kind, direction, sender_name, body, status)
  VALUES (c.id, 'message', 'in', c.patient_name, b, 'delivered')
  RETURNING * INTO m;

  UPDATE public.patient_conversations
     SET last_preview = left(regexp_replace(b, '\s+', ' ', 'g'), 140),
         last_message_at = m.created_at,
         archived = false,
         unread_count = unread_count + 1
   WHERE id = c.id;

  RETURN jsonb_build_object(
    'id', m.id, 'kind', m.kind, 'direction', m.direction,
    'sender_name', m.sender_name, 'body', m.body, 'meta', '{}'::jsonb,
    'status', m.status, 'read_at', m.read_at, 'created_at', m.created_at,
    'internal', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.comms_patient_mark_read(p_token text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF length(coalesce(p_token, '')) < 16 THEN RETURN; END IF;
  UPDATE public.patient_messages m
     SET read_at = now(), status = 'read'
    FROM public.patient_conversations c
   WHERE c.channel = 'chat' AND c.patient_token = p_token
     AND m.conversation_id = c.id
     AND m.direction = 'out' AND m.kind = 'message'
     AND NOT m.internal AND m.read_at IS NULL
     AND m.status IN ('sent', 'delivered');
END;
$$;

REVOKE ALL ON FUNCTION public.comms_patient_thread(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.comms_patient_send(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.comms_patient_mark_read(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.comms_patient_thread(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.comms_patient_send(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.comms_patient_mark_read(text) TO anon, authenticated;
