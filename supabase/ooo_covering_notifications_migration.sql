-- Out of Office notifications: tell the covering provider why work reached
-- them, and what an Out of Office reassignment moved to them.
--
--   ooo.covering_started   "You're covering for Navin Jethwani."
--                          "Navin is out of office 11/11/2026 – 11/24/2026. Their messages, calls and new work come to you."
--                          → View Covered Work            (shown from the start date: visible_at)
--   message.covering       "New SMS from Amy Phillips."  (or "New email …", "New chat message …")
--                          "In Main Line, assigned to Navin Jethwani. You're receiving this because you're covering for them."
--                          → Open Conversation
--   call.missed_covering   "Missed call from Amy Phillips."   "Called Navin Jethwani. …"  → Open Conversation
--   efax.covering          "New eFax in Billing."             "Assigned to Navin Jethwani. …" → Open eFax
--   …then, once their work is reassigned, the same notice says what and by whom:
--                          "You're covering for Navin Jethwani."
--                          "Devanshi Sharma assigned you 8 appointments, 6 tasks and 2 care programs from Navin, out of office 11/11/2026 – 11/24/2026."
--                          → View Summary (only what came to me)
--   ooo.reassigned         Without a coverage notice to update (e.g. covering someone else's
--                          record): "18 items assigned to you."
--                          "Devanshi Sharma reassigned 8 appointments, 6 tasks and 4 care programs from Aditi Kalegaonkar to you."
--                          → View Summary   (replaces "Out of Office reassignment summary: you're covering for …")
--
-- "Welcome back" (to the person who was out) is built in the app, since its
-- counts are only known on the day they return.
--
-- Who a message or fax was for: the inbox's collaborators when the thread has
-- an inbox, else whoever last wrote to the patient; for a fax, the number's
-- linked users. Anyone of them out of office right now → each of their
-- covering providers is told (once per thread while unread).
--
-- Every trigger swallows its own errors: a notification must never block a
-- message, fax or record from saving. Run after notifications_migration.sql,
-- reassignment_notifications_migration.sql, reassignment_covering_summary_migration.sql,
-- comms_inboxes_migration.sql and efax_inbound_number_migration.sql.
-- Additive and idempotent: safe to run more than once.

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS conversation_id text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS conversation_channel text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS efax_id text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS covering_for text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS ooo_record_id text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS visible_at timestamptz;

-- Covering providers (uuid) of someone out of office right now, by user id
-- or (older records) by name.
CREATE OR REPLACE FUNCTION public.ooo_covering_now(p_user_id text, p_user_name text)
RETURNS TABLE (cover_id uuid, absent_name text, record_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT DISTINCT (c->>'userId')::uuid, r.user_name, r.id
    FROM public.ooo_records r
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(r.coverage, '[]'::jsonb)) AS c
   WHERE now() >= r.start_at AND now() < r.end_at
     AND ((p_user_id IS NOT NULL AND r.user_id = p_user_id)
          OR (p_user_name IS NOT NULL AND lower(r.user_name) = lower(p_user_name)))
     AND c->>'userId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     AND (p_user_id IS NULL OR c->>'userId' <> p_user_id);
$$;

-- ── Patient messages and missed calls ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.emit_covering_message_notifications()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  conv record;
  collab text[];
  last_id text;
  last_name text;
  who record;
  cov record;
  is_call boolean;
  ntype text;
  inbox_name text;
  word text;
BEGIN
  IF NEW.direction IS DISTINCT FROM 'in' OR NEW.internal THEN RETURN NEW; END IF;
  is_call := NEW.kind = 'call';
  IF is_call AND coalesce(NEW.meta->>'outcome', '') <> 'missed' THEN RETURN NEW; END IF;
  ntype := CASE WHEN is_call THEN 'call.missed_covering' ELSE 'message.covering' END;

  SELECT * INTO conv FROM public.patient_conversations WHERE id = NEW.conversation_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT collaborator_ids, name INTO collab, inbox_name FROM public.comms_inboxes WHERE id = conv.inbox_id;
  word := CASE conv.channel WHEN 'sms' THEN 'SMS' WHEN 'chat' THEN 'chat message' WHEN 'email' THEN 'email' ELSE 'message' END;
  IF collab IS NULL OR cardinality(collab) = 0 THEN
    SELECT m.sender_id::text, m.sender_name INTO last_id, last_name
      FROM public.patient_messages m
     WHERE m.conversation_id = NEW.conversation_id AND m.direction = 'out' AND NOT m.internal
       AND coalesce(m.meta->>'ooo_auto_reply', '') <> 'true'
     ORDER BY m.created_at DESC LIMIT 1;
  END IF;

  FOR who IN
    SELECT unnest(collab) AS uid, NULL::text AS uname WHERE collab IS NOT NULL
    UNION ALL
    SELECT last_id, last_name WHERE (collab IS NULL OR cardinality(collab) = 0) AND (last_id IS NOT NULL OR last_name IS NOT NULL)
  LOOP
    FOR cov IN SELECT * FROM public.ooo_covering_now(who.uid, who.uname) LOOP
      -- Once per thread while the last one is unread.
      IF EXISTS (SELECT 1 FROM public.notifications n
                  WHERE n.recipient_id = cov.cover_id AND n.type = ntype
                    AND n.conversation_id = NEW.conversation_id::text AND NOT n.read) THEN
        CONTINUE;
      END IF;
      INSERT INTO public.notifications (recipient_id, type, title, body, action, conversation_id, conversation_channel, covering_for, ooo_record_id)
      VALUES (
        cov.cover_id,
        ntype,
        CASE WHEN is_call THEN 'Missed call from ' ELSE 'New ' || word || ' from ' END || coalesce(nullif(conv.patient_name, ''), 'a patient') || '.',
        CASE
          WHEN is_call THEN 'Called ' || cov.absent_name
          WHEN inbox_name IS NOT NULL THEN 'In ' || inbox_name || ', assigned to ' || cov.absent_name
          ELSE 'Assigned to ' || cov.absent_name
        END || '. You''re receiving this because you''re covering for them.',
        'openCommsConversation',
        NEW.conversation_id::text,
        conv.channel,
        cov.absent_name,
        cov.record_id
      );
    END LOOP;
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN others THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS emit_covering_message_notifications ON public.patient_messages;
CREATE TRIGGER emit_covering_message_notifications
  AFTER INSERT ON public.patient_messages
  FOR EACH ROW EXECUTE FUNCTION public.emit_covering_message_notifications();

-- ── eFax ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.emit_covering_efax_notifications()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  num record;
  uid text;
  cov record;
BEGIN
  SELECT * INTO num FROM public.efax_numbers WHERE id = coalesce(NEW.efax_number_id, 'efax-1');
  IF NOT FOUND THEN RETURN NEW; END IF;
  FOREACH uid IN ARRAY coalesce(num.linked_user_ids, '{}') LOOP
    FOR cov IN SELECT * FROM public.ooo_covering_now(uid, NULL) LOOP
      INSERT INTO public.notifications (recipient_id, type, title, body, action, efax_id, covering_for, ooo_record_id)
      VALUES (
        cov.cover_id,
        'efax.covering',
        'New eFax in ' || num.name || '.',
        'Assigned to ' || cov.absent_name || '. You''re receiving this because you''re covering for them.',
        'openEfax',
        NEW.id,
        cov.absent_name,
        cov.record_id
      );
    END LOOP;
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN others THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS emit_covering_efax_notifications ON public.efax_inbound;
CREATE TRIGGER emit_covering_efax_notifications
  AFTER INSERT ON public.efax_inbound
  FOR EACH ROW EXECUTE FUNCTION public.emit_covering_efax_notifications();

-- ── Coverage starts ──────────────────────────────────────────────────────
-- One notice per covering provider, shown from the start date. Changing the
-- dates or the cover replaces notices not shown yet; deleting the record
-- removes them.
CREATE OR REPLACE FUNCTION public.emit_covering_started_notifications()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  rec record;
  cover_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.notifications
     WHERE ooo_record_id = OLD.id AND type = 'ooo.covering_started' AND (visible_at > now() OR NOT read);
    RETURN OLD;
  END IF;
  rec := NEW;
  IF rec.end_at <= now() THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    DELETE FROM public.notifications
     WHERE ooo_record_id = rec.id AND type = 'ooo.covering_started' AND visible_at > now();
  END IF;
  FOR cover_id IN
    SELECT DISTINCT (c->>'userId')::uuid
      FROM jsonb_array_elements(coalesce(rec.coverage, '[]'::jsonb)) AS c
     WHERE c->>'userId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       AND c->>'userId' IS DISTINCT FROM rec.user_id
  LOOP
    -- Already told (and it's showing)? Leave it.
    IF EXISTS (SELECT 1 FROM public.notifications n
                WHERE n.recipient_id = cover_id AND n.type = 'ooo.covering_started'
                  AND n.ooo_record_id = rec.id) THEN
      CONTINUE;
    END IF;
    INSERT INTO public.notifications (recipient_id, type, title, body, action, covering_for, ooo_record_id, visible_at, created_at)
    VALUES (
      cover_id,
      'ooo.covering_started',
      'You''re covering for ' || rec.user_name || '.',
      split_part(rec.user_name, ' ', 1) || ' is out of office '
        || to_char(rec.start_at, 'MM/DD/YYYY') || ' – ' || to_char(rec.end_at, 'MM/DD/YYYY')
        || '. Their messages, calls and new work come to you.',
      'openCoveredWork',
      rec.user_name,
      rec.id,
      rec.start_at,
      greatest(rec.start_at, now())
    );
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN others THEN
  RETURN coalesce(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS emit_covering_started_notifications ON public.ooo_records;
CREATE TRIGGER emit_covering_started_notifications
  AFTER INSERT OR UPDATE OF start_at, end_at, coverage OR DELETE ON public.ooo_records
  FOR EACH ROW EXECUTE FUNCTION public.emit_covering_started_notifications();

-- ── Out of Office reassignment: one notice per covering provider ─────────
-- Replaces emit_reassignment_notifications from
-- reassignment_covering_summary_migration.sql. Appointment-only jobs (from
-- Reassign Appointments) keep "N new appointments assigned to you."
CREATE OR REPLACE FUNCTION public.emit_reassignment_notifications()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r record;
  mixed boolean;
  parts text[];
  phrase text;
  total int;
BEGIN
  IF NEW.status IS DISTINCT FROM 'done' THEN
    RETURN NEW;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(coalesce(NEW.results, '[]'::jsonb)) AS res
     WHERE coalesce(res->>'kind', 'appointment') <> 'appointment'
  ) INTO mixed;
  FOR r IN
    SELECT res->>'toId' AS to_id,
           count(*) FILTER (WHERE coalesce(res->>'kind', 'appointment') = 'appointment') AS appts,
           count(*) FILTER (WHERE res->>'kind' = 'task') AS tasks,
           count(*) FILTER (WHERE res->>'kind' = 'program') AS programs
      FROM jsonb_array_elements(coalesce(NEW.results, '[]'::jsonb)) AS res
     WHERE res->>'outcome' = 'reassigned'
       AND res->>'toId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     GROUP BY res->>'toId'
  LOOP
    IF mixed THEN
      parts := ARRAY[]::text[];
      IF r.appts > 0 THEN parts := parts || (r.appts || CASE WHEN r.appts = 1 THEN ' appointment' ELSE ' appointments' END); END IF;
      IF r.tasks > 0 THEN parts := parts || (r.tasks || CASE WHEN r.tasks = 1 THEN ' task' ELSE ' tasks' END); END IF;
      IF r.programs > 0 THEN parts := parts || (r.programs || CASE WHEN r.programs = 1 THEN ' care program' ELSE ' care programs' END); END IF;
      -- "a", "a and b", "a, b and c"
      phrase := CASE
        WHEN cardinality(parts) <= 1 THEN coalesce(parts[1], '')
        ELSE array_to_string(parts[1:cardinality(parts) - 1], ', ') || ' and ' || parts[cardinality(parts)]
      END;
      total := r.appts + r.tasks + r.programs;
      -- The covering provider's "You're covering for …" notice for this
      -- record says what was assigned and by whom (shown again as unread).
      UPDATE public.notifications n
         SET body = coalesce(NEW.created_by, 'Someone') || ' assigned you ' || phrase || ' from '
                    || split_part(coalesce(NEW.from_user, 'another provider'), ' ', 1) || ', out of office '
                    || to_char(o.start_at, 'MM/DD/YYYY') || ' – ' || to_char(o.end_at, 'MM/DD/YYYY') || '.',
             action = 'openReassignmentSummary',
             reassignment_job_id = NEW.id,
             read = false,
             created_at = greatest(n.created_at, now())
        FROM public.ooo_records o
       WHERE o.id = NEW.ooo_record_id
         AND n.recipient_id = r.to_id::uuid AND n.type = 'ooo.covering_started' AND n.ooo_record_id = NEW.ooo_record_id;
      IF FOUND THEN CONTINUE; END IF;
      INSERT INTO public.notifications (recipient_id, actor_name, type, title, body, action, reassignment_job_id, covering_for)
      VALUES (
        r.to_id::uuid,
        NEW.created_by,
        'ooo.reassigned',
        total || CASE WHEN total = 1 THEN ' item assigned to you.' ELSE ' items assigned to you.' END,
        coalesce(NEW.created_by, 'Someone') || ' reassigned ' || phrase || ' from ' || coalesce(NEW.from_user, 'another provider') || ' to you.',
        'openReassignmentSummary',
        NEW.id,
        NEW.from_user
      );
    ELSIF r.appts > 0 THEN
      INSERT INTO public.notifications (recipient_id, actor_name, type, title, body, action, reassignment_job_id)
      VALUES (
        r.to_id::uuid,
        NEW.created_by,
        'appointment.reassigned',
        r.appts || CASE WHEN r.appts = 1 THEN ' new appointment assigned to you.' ELSE ' new appointments assigned to you.' END,
        coalesce(NEW.created_by, 'Someone') || ' reassigned ' || r.appts
          || CASE WHEN r.appts = 1 THEN ' appointment' ELSE ' appointments' END
          || ' from ' || coalesce(NEW.from_user, 'another provider') || ' to you.',
        'viewAssignedAppointments',
        NEW.id
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
