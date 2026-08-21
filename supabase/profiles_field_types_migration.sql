-- Typed profile fields on `public.profiles` with CHECK constraints that mirror
-- `src/lib/profileValidation.js`. Keep both in sync.
--
-- Uses ADD COLUMN IF NOT EXISTS + NOT VALID constraints so existing rows that
-- predate the rules do not block the migration. Promote constraints once data
-- is clean:
--   alter table public.profiles validate constraint profiles_gender_check;
--   … (repeat for each constraint below)

begin;

-- ── Column types ────────────────────────────────────────────────────────────
-- Demographics / contact / address columns the Preferences drawer writes.
alter table public.profiles add column if not exists first_name     text;
alter table public.profiles add column if not exists last_name      text;
alter table public.profiles add column if not exists middle_name    text;
alter table public.profiles add column if not exists gender         text;
alter table public.profiles add column if not exists bio            text;
alter table public.profiles add column if not exists mobile         text;
alter table public.profiles add column if not exists fax            text;
alter table public.profiles add column if not exists zip_code       text;
alter table public.profiles add column if not exists address_line1  text;
alter table public.profiles add column if not exists address_line2  text;
alter table public.profiles add column if not exists city           text;
alter table public.profiles add column if not exists state          text;

-- languages: production already has this as text[]. Convert to jsonb so the
-- client (and jsonb_typeof check below) agree on one shape. Skip if already
-- jsonb or if the column does not exist yet.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'profiles'
       and column_name = 'languages'
  ) then
    alter table public.profiles add column languages jsonb default '[]'::jsonb;
  elsif exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'profiles'
       and column_name = 'languages'
       and udt_name = '_text'
  ) then
    alter table public.profiles
      alter column languages drop default;
    alter table public.profiles
      alter column languages type jsonb
      using coalesce(to_jsonb(languages), '[]'::jsonb);
    alter table public.profiles
      alter column languages set default '[]'::jsonb;
  else
    alter table public.profiles
      alter column languages set default '[]'::jsonb;
  end if;
end $$;

-- date_of_birth: store as ISO date. If the column already exists as text,
-- coerce YYYY-MM-DD strings; leave unparseable legacy values as NULL.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'profiles'
       and column_name = 'date_of_birth'
  ) then
    alter table public.profiles add column date_of_birth date;
  elsif exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'profiles'
       and column_name = 'date_of_birth'
       and data_type <> 'date'
  ) then
    alter table public.profiles
      alter column date_of_birth type date
      using (
        case
          when date_of_birth ~ '^\d{4}-\d{2}-\d{2}$'
            then date_of_birth::date
          else null
        end
      );
  end if;
end $$;

-- ── CHECK constraints (mirror profileValidation.js) ─────────────────────────
alter table public.profiles drop constraint if exists profiles_gender_check;
alter table public.profiles add constraint profiles_gender_check
  check (
    gender is null
    or gender in ('Male', 'Female', 'Non-binary', 'Prefer not to say')
  )
  not valid;

alter table public.profiles drop constraint if exists profiles_bio_length;
alter table public.profiles add constraint profiles_bio_length
  check (bio is null or char_length(bio) <= 500)
  not valid;

alter table public.profiles drop constraint if exists profiles_mobile_check;
alter table public.profiles add constraint profiles_mobile_check
  check (
    mobile is null
    or (char_length(mobile) >= 7 and char_length(mobile) <= 20)
  )
  not valid;

alter table public.profiles drop constraint if exists profiles_zip_code_check;
alter table public.profiles add constraint profiles_zip_code_check
  check (
    zip_code is null
    or zip_code ~ '^\d{5}(-\d{4})?$'
  )
  not valid;

alter table public.profiles drop constraint if exists profiles_languages_array;
alter table public.profiles add constraint profiles_languages_array
  check (
    languages is null
    or jsonb_typeof(languages) = 'array'
  )
  not valid;

alter table public.profiles drop constraint if exists profiles_address_line1_length;
alter table public.profiles add constraint profiles_address_line1_length
  check (address_line1 is null or char_length(address_line1) <= 200)
  not valid;

alter table public.profiles drop constraint if exists profiles_address_line2_length;
alter table public.profiles add constraint profiles_address_line2_length
  check (address_line2 is null or char_length(address_line2) <= 200)
  not valid;

alter table public.profiles drop constraint if exists profiles_city_length;
alter table public.profiles add constraint profiles_city_length
  check (city is null or char_length(city) <= 100)
  not valid;

alter table public.profiles drop constraint if exists profiles_state_length;
alter table public.profiles add constraint profiles_state_length
  check (state is null or char_length(state) <= 100)
  not valid;

commit;

-- ── Verify ──────────────────────────────────────────────────────────────────
-- select column_name, data_type
--   from information_schema.columns
--  where table_schema = 'public' and table_name = 'profiles'
--    and column_name in (
--      'first_name','last_name','gender','date_of_birth','mobile','bio',
--      'languages','address_line1','address_line2','city','state','zip_code'
--    )
--  order by column_name;
--
-- Bad gender should fail on INSERT/UPDATE:
--   update public.profiles set gender = 'Unknown' where email = 'demo@fold.health';
--   Expect: ERROR … profiles_gender_check
