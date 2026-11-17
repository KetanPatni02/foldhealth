-- Care gaps whitelisted on Fold. The HEDIS worklist's "Add Care Gaps"
-- drawer only lists these, and only these are billed. Whitelisting is
-- managed outside Fold; rows here are reference data.
--
-- ipas / hp_codes scope a measure to specific contracts; an empty array
-- means the measure applies to every IPA / HP code.
--
-- Seed: `bun run seed` upserts CAREGAP_WHITELIST_MOCK
-- (src/features/hedis-worklist/data/caregapWhitelistMock.js).
--
-- Added gaps live in hedis_members.gaps (jsonb). A re-added measure keeps
-- its closed predecessor in the gap's `parentGap` field, so no link table.

begin;

create table if not exists public.caregap_whitelist (
  id            text        primary key,
  code          text        not null,
  name          text        not null,
  measure_year  integer     not null,
  ipas          text[]      not null default '{}',
  hp_codes      text[]      not null default '{}',
  billable      boolean     not null default true,
  active        boolean     not null default true,
  created_at    timestamptz not null default now(),
  unique (code, measure_year)
);

create index if not exists caregap_whitelist_year_idx
  on public.caregap_whitelist (measure_year);

-- RLS: signed-in staff read the whitelist (same practice-wide model as the
-- other caregap_* tables; see RLS_POSTURE.md). Writes go through the
-- service role only.
alter table public.caregap_whitelist enable row level security;

drop policy if exists caregap_whitelist_read on public.caregap_whitelist;
create policy caregap_whitelist_read
  on public.caregap_whitelist for select
  to authenticated
  using ((select auth.uid()) is not null);

commit;
