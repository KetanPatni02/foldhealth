-- Patient-level outreach (HCC Outreach story, Phase 1).
--
-- Each outreach is saved once on the patient, keyed by Member ID
-- (patient_key), with no DOS, HCC or ICD key. The HCC chart shows it on every
-- DOS, HCC, ICD and document for that patient, including records created
-- later: display is a lookup by patient, nothing is copied.
--
--   program          care program it was logged from ('RA' for the HCC
--                    worklist / Single View); never limits who can see it
--   recipient_type   'pcp' (PCP / PCP Office) or 'member'
--   mode             'Call' | 'Email' | 'In Person'
--   category         'Successful' | 'Unsuccessful' | 'Note' (Note has no
--                    outcome and is not a contact attempt)
--   outcome          the outcome label at save time, so a later deactivated
--                    outcome still reads on old entries
--   corrects_id      a correction is a new Note linked to the entry it
--                    corrects; saved entries are never edited
--   pcp_outreach_id  set on entries created from a PCP Outreach (Phase 6)
--
-- Separate from hcc_outreach_logs (the earlier HCC Outreach tab), which is
-- left as is.
--
-- Signed-in staff only, like the other HCC tables (RLS_POSTURE.md).

CREATE TABLE IF NOT EXISTS public.patient_outreach (
  id               text PRIMARY KEY,
  patient_key      text NOT NULL,
  patient_name     text,
  program          text NOT NULL DEFAULT 'RA',
  recipient_type   text NOT NULL CHECK (recipient_type IN ('pcp', 'member')),
  received_by      text,
  mode             text NOT NULL CHECK (mode IN ('Call', 'Email', 'In Person')),
  direction        text CHECK (direction IN ('outgoing', 'incoming')),
  call_via         text,
  called_to        text,
  duration_sec     integer,
  transcript       text,
  email_to         text,
  email_subject    text,
  email_body       text,
  notes            text NOT NULL DEFAULT '',
  category         text NOT NULL CHECK (category IN ('Successful', 'Unsuccessful', 'Note')),
  outcome          text,
  logged_by        text NOT NULL DEFAULT '',
  logged_by_role   text,
  logged_at        timestamptz NOT NULL,
  snooze_until     text,
  corrects_id      text REFERENCES public.patient_outreach(id),
  pcp_outreach_id  text,
  -- HCCs an older HCC-level outreach was logged against, kept as a
  -- reference when it moved to the patient (AC-13)
  hcc_refs         text[] NOT NULL DEFAULT '{}',
  -- AI summary (Phase 5): 'ready' | 'unavailable' | 'none' (no text to read)
  ai_status        text NOT NULL DEFAULT 'none',
  ai_call_summary  text,
  -- [{ text, refs: [{ type: 'HCC'|'ICD'|'DOS', id, matched }] }]
  ai_patient_actions jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_outreach_patient_idx
  ON public.patient_outreach (patient_key, logged_at DESC);

-- Records the AI patient action summary mentions (Phase 5): one row per
-- HCC, ICD or DOS, matched or not ("Not matched to a record").
CREATE TABLE IF NOT EXISTS public.outreach_record_links (
  id           bigserial PRIMARY KEY,
  outreach_id  text NOT NULL REFERENCES public.patient_outreach(id) ON DELETE CASCADE,
  record_type  text NOT NULL CHECK (record_type IN ('HCC', 'ICD', 'DOS')),
  record_id    text NOT NULL,
  matched      boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS outreach_record_links_outreach_idx
  ON public.outreach_record_links (outreach_id);

ALTER TABLE public.patient_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_record_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON public.patient_outreach;
CREATE POLICY "Allow all" ON public.patient_outreach
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all" ON public.outreach_record_links;
CREATE POLICY "Allow all" ON public.outreach_record_links
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PCP Outreach (Phase 6): one call, email or visit with a PCP office about
-- several patients. Each selected patient gets its own patient_outreach row
-- pointing here; content marked Unresolved stays on this record only.
CREATE TABLE IF NOT EXISTS public.pcp_outreach (
  id               text PRIMARY KEY,
  pcp_name         text NOT NULL,
  mode             text NOT NULL CHECK (mode IN ('Call', 'Email', 'In Person')),
  direction        text,
  call_via         text,
  called_to        text,
  duration_sec     integer,
  transcript       text,
  email_to         text,
  email_subject    text,
  email_body       text,
  notes            text NOT NULL DEFAULT '',
  category         text NOT NULL,
  outcome          text,
  -- [{ text, reason }] the user could not match to a patient
  unresolved       jsonb NOT NULL DEFAULT '[]'::jsonb,
  logged_by        text NOT NULL DEFAULT '',
  logged_by_role   text,
  logged_at        timestamptz NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pcp_outreach ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON public.pcp_outreach;
CREATE POLICY "Allow all" ON public.pcp_outreach
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Outcome list (Phase 3): per tenant, care program, category and recipient.
-- An outcome in use is deactivated, never deleted; saved entries keep the
-- label they used.
CREATE TABLE IF NOT EXISTS public.outreach_outcomes (
  id          text PRIMARY KEY,
  tenant_id   text NOT NULL DEFAULT 'default',
  program     text NOT NULL DEFAULT 'RA',
  category    text NOT NULL CHECK (category IN ('Successful', 'Unsuccessful')),
  label       text NOT NULL,
  recipients  text[] NOT NULL DEFAULT '{pcp,member}',
  active      boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.outreach_outcomes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON public.outreach_outcomes;
CREATE POLICY "Allow all" ON public.outreach_outcomes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Launch list.
INSERT INTO public.outreach_outcomes (id, category, label, recipients, sort_order) VALUES
  ('oo-spoke-provider',  'Successful',   'Spoke with Provider',              '{pcp}',        1),
  ('oo-f2f-provider',    'Successful',   'Face-to-Face Visit with Provider', '{pcp}',        2),
  ('oo-provider-declined','Successful',  'Provider Declined',                '{pcp}',        3),
  ('oo-spoke-patient',   'Successful',   'Spoke with Patient',               '{member}',     4),
  ('oo-no-answer',       'Unsuccessful', 'No Answer / Left Voicemail',       '{pcp,member}', 5),
  ('oo-utr',             'Unsuccessful', 'Unable to Reach (UTR)',            '{pcp,member}', 6),
  ('oo-wrong-number',    'Unsuccessful', 'Wrong Number',                     '{pcp,member}', 7)
ON CONFLICT (id) DO NOTHING;

-- Existing data (AC-13): outreach logged at HCC level (hcc_outreach_logs,
-- the earlier HCC Outreach tab) moves to the patient, keeping its HCCs as a
-- reference. The patient is the HCC member's Member ID. Types outside the
-- three modes keep their original type at the start of the notes. Safe to
-- re-run: rows already moved are skipped.
DO $$
BEGIN
  IF to_regclass('public.hcc_outreach_logs') IS NOT NULL THEN
    INSERT INTO public.patient_outreach (
      id, patient_key, patient_name, program, recipient_type, received_by, mode, direction,
      call_via, called_to, duration_sec, transcript, notes, category, outcome,
      logged_by, logged_by_role, logged_at, snooze_until, hcc_refs
    )
    SELECT
      'moved-' || l.id,
      COALESCE(m.member_id, l.member_id, l.member_name),
      l.member_name,
      'RA',
      CASE WHEN l.call_details->>'callType' = 'Member' THEN 'member' ELSE 'pcp' END,
      l.call_details->>'to',
      CASE WHEN l.type IN ('Call', 'Virtual') THEN 'Call'
           WHEN l.type IN ('Email', 'SMS', 'Chat', 'Letter') THEN 'Email'
           ELSE 'In Person' END,
      CASE WHEN l.type = 'Call' THEN COALESCE(l.call_details->>'direction', 'outgoing') END,
      l.call_details->>'via',
      l.call_details->>'to',
      CASE WHEN l.call_details ? 'durationMin' THEN round((l.call_details->>'durationMin')::numeric * 60)::integer END,
      NULL,
      CASE WHEN l.type IN ('Call', 'Email', 'In Person') THEN l.note ELSE '[' || l.type || '] ' || l.note END,
      CASE WHEN l.outcome_color ILIKE '%success%' THEN 'Successful'
           WHEN l.outcome_color ILIKE '%error%' THEN 'Unsuccessful'
           ELSE 'Note' END,
      CASE WHEN l.outcome_color ILIKE '%success%' OR l.outcome_color ILIKE '%error%' THEN l.outcome END,
      split_part(l.author, ' (', 1),
      NULLIF(rtrim(split_part(l.author, ' (', 2), ')'), ''),
      (l.log_date::text || ' ' || COALESCE(NULLIF(l.log_time, ''), '00:00'))::timestamp,
      l.snooze_until,
      COALESCE(l.hccs, '{}')
    FROM public.hcc_outreach_logs l
    LEFT JOIN LATERAL (
      SELECT hm.member_id FROM public.hcc_members hm
      WHERE hm.id::text = l.member_id OR hm.name = l.member_name
      ORDER BY (hm.id::text = l.member_id) DESC
      LIMIT 1
    ) m ON true
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
