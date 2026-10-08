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
-- browser calls. That page reads with the anon key, so both tables need a
-- permissive policy. There is no seed: every row is a real conversation.

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
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on patient_messages" ON public.patient_messages;
CREATE POLICY "Allow all on patient_messages" ON public.patient_messages
  FOR ALL USING (true) WITH CHECK (true);

-- Realtime: new messages show up live for staff and on the patient's page.
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
