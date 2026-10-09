-- Demo-safe patient phone numbers.
--
-- Comms sends real SMS and opens real calls, so no demo patient may carry a
-- number that could belong to a stranger. Every patient phone becomes a
-- number in 555-0100 – 555-0199, the North American range reserved for
-- fiction: it never reaches a real line. The area code and last two digits
-- come from a hash of the row id, so a number is stable across re-runs and
-- patients don't all share one.
--
-- The one exception is Annette Brave, the team's test patient: her number is
-- a real one we own, +91 78389 97914, so texts and calls to her arrive.
--
-- Covers every patient phone column: all_patients.phone, patients.phone,
-- hedis_members.phone and p360_profiles.extra_phones (extra contact numbers).
-- Rows with no phone stay empty. Safe to run more than once.

CREATE OR REPLACE FUNCTION pg_temp.demo_phone(seed text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT '(' || (ARRAY['212','213','310','312','323','347','415','503','617','626','646','702','713','718','773','818','917','914'])[1 + abs(hashtext(seed)) % 18]
      || ') 555-01' || lpad((abs(hashtext(seed || '#')) % 100)::text, 2, '0');
$$;

-- all_patients (the patient list Comms picks from)
UPDATE public.all_patients
   SET phone = pg_temp.demo_phone(id)
 WHERE phone IS NOT NULL AND phone <> ''
   AND lower(trim(name)) <> 'annette brave';
UPDATE public.all_patients
   SET phone = '+917838997914'
 WHERE lower(trim(name)) = 'annette brave';

-- patients (TOC)
UPDATE public.patients
   SET phone = pg_temp.demo_phone(id)
 WHERE phone IS NOT NULL AND phone <> ''
   AND lower(trim(name)) <> 'annette brave';
UPDATE public.patients
   SET phone = '+917838997914'
 WHERE lower(trim(name)) = 'annette brave';

-- hedis_members
UPDATE public.hedis_members
   SET phone = pg_temp.demo_phone(id)
 WHERE phone IS NOT NULL AND phone <> ''
   AND lower(trim(name)) <> 'annette brave';
UPDATE public.hedis_members
   SET phone = '+917838997914'
 WHERE lower(trim(name)) = 'annette brave';

-- p360_profiles.extra_phones: [{ number, hours }]. Each number becomes a
-- demo one; Annette's profile keeps none, so her only number is the real one.
UPDATE public.p360_profiles p
   SET extra_phones = COALESCE((
         SELECT jsonb_agg(jsonb_set(e, '{number}', to_jsonb(pg_temp.demo_phone(p.patient_id || ':' || i::text))))
           FROM jsonb_array_elements(p.extra_phones) WITH ORDINALITY AS t(e, i)
       ), '[]'::jsonb)
 WHERE jsonb_typeof(p.extra_phones) = 'array'
   AND jsonb_array_length(p.extra_phones) > 0
   AND p.patient_id NOT IN (SELECT id FROM public.all_patients WHERE lower(trim(name)) = 'annette brave');
UPDATE public.p360_profiles
   SET extra_phones = '[]'::jsonb
 WHERE patient_id IN (SELECT id FROM public.all_patients WHERE lower(trim(name)) = 'annette brave');

-- Comms threads already opened keep the number they were opened with; bring
-- them in line with the patient record.
-- (Skipped when the Comms tables don't exist yet.)
DO $$
BEGIN
  IF to_regclass('public.patient_conversations') IS NOT NULL THEN
    UPDATE public.patient_conversations c
       SET patient_phone = a.phone
      FROM public.all_patients a
     WHERE c.patient_id = a.id
       AND c.patient_phone IS DISTINCT FROM a.phone;
  END IF;
END $$;
