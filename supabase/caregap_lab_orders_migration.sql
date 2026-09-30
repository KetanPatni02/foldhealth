-- Care Gap lab workflow: lab orders and lab results for HEDIS care gaps.
--
--   caregap_lab_orders   one row per lab order (one requisition to one
--                        performing lab) placed from a care gap. An order
--                        carries one or more tests (tests text[]) and one or
--                        more ICD-10 diagnoses (diagnoses jsonb, first is
--                        primary: [{ "code": "E11.9", "title": "..." }]).
--                        status: Draft | Ordered | Awaiting Collection |
--                        Collected | In Process | Result Available |
--                        Completed | Cancelled
--   caregap_lab_results  results tied to an order (lab_order_id), or
--                        external results with no order (lab_order_id null).
--
-- The lab order's status and the care gap's status are separate: whether a
-- result satisfies the gap is evaluated by the app from the measure rule and
-- the measurement period (evidence_status records the last evaluation).
--
-- Seed (idempotent): an HbA1c from Aug 14, 2025 for members with a GSD3
-- gap, outside the 2026 measurement period, so the gap starts Open.

begin;

create table if not exists public.caregap_lab_orders (
  id                 text        primary key,
  hedis_member_id    text        not null,
  gap_code           text        not null,
  measurement_year   int,
  tests              text[]      not null default '{}',
  diagnoses          jsonb       not null default '[]'::jsonb,
  priority           text        not null default 'Routine',
  performing_lab     text,
  ordering_provider  text,
  status             text        not null default 'Ordered',
  ordered_at         timestamptz not null default now(),
  collected_at       timestamptz,
  cancelled_at       timestamptz,
  cancel_reason      text,
  created_by         text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.caregap_lab_results (
  id                 text        primary key,
  lab_order_id       text        references public.caregap_lab_orders(id) on delete set null,
  hedis_member_id    text        not null,
  gap_code           text        not null,
  test_name          text        not null,
  value              text,
  unit               text,
  reference_range    text,
  flag               text,
  note               text,
  collected_at       timestamptz,
  resulted_at        timestamptz,
  source             text,
  evidence_status    text,
  reviewed_by        text,
  reviewed_at        timestamptz,
  created_at         timestamptz not null default now()
);

create index if not exists caregap_lab_orders_member_idx on public.caregap_lab_orders (hedis_member_id, gap_code);
create index if not exists caregap_lab_results_member_idx on public.caregap_lab_results (hedis_member_id, gap_code);

alter table public.caregap_lab_orders enable row level security;
alter table public.caregap_lab_results enable row level security;

drop policy if exists caregap_lab_orders_all on public.caregap_lab_orders;
create policy caregap_lab_orders_all on public.caregap_lab_orders
  for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
drop policy if exists caregap_lab_results_all on public.caregap_lab_results;
create policy caregap_lab_results_all on public.caregap_lab_results
  for all to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);

-- ── Seed: prior HbA1c outside the measurement period ─────────────────────────
insert into public.caregap_lab_results
  (id, hedis_member_id, gap_code, test_name, value, unit, reference_range, flag, collected_at, resulted_at, source, evidence_status)
select 'labres-prior-' || m.id, m.id, 'GSD3', 'HbA1c', '8.2', '%', '4.0 – 5.6 %', 'High',
       '2025-08-14T09:00:00Z', '2025-08-15T14:00:00Z', 'Quest Diagnostics', 'Outside Measurement Period'
  from public.hedis_members m
 where m.gaps @> '[{"code":"GSD3"}]'::jsonb
on conflict (id) do nothing;

commit;

-- ── Verify ──────────────────────────────────────────────────────────────────
--   select count(*) from public.caregap_lab_results where id like 'labres-prior-%';
--
-- ── Rollback ────────────────────────────────────────────────────────────────
--   drop table if exists public.caregap_lab_results;
--   drop table if exists public.caregap_lab_orders;
