-- HEDIS Care Gap comments: @mentions, author-only edit/delete, mention bells.
--
-- Mirrors the Diagnosis Gap comment setup (hcc_diag_comment_author_migration
-- + hcc_diag_comment_rls_and_edit_mentions_migration) for the Care Gap
-- Details drawer's Activity tab.
--
--   * author / author_id are stamped from the session on insert and pinned on
--     update, so a comment can't be posted as, or re-attributed to, someone
--     else.
--   * RLS: every signed-in user reads; only the author inserts, edits, deletes.
--   * Mentioned people get a bell row in `notifications` on insert, and on an
--     edit only for ids that are newly added (new minus old).
--
-- No seed: comments accrue as users post them.

begin;

create table if not exists public.caregap_comments (
  id              text        primary key,
  hedis_member_id text        not null,
  gap_code        text,
  author          text,
  author_id       uuid,
  body            text        not null,
  mention_ids     uuid[],
  edited          boolean     not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists caregap_comments_member_idx
  on public.caregap_comments (hedis_member_id, created_at desc);

-- ── Authorship ──────────────────────────────────────────────────────────────
create or replace function public.stamp_caregap_comment_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  label text;
begin
  if actor is null then
    return new;  -- seed / service role: keep the supplied author
  end if;
  new.author_id := actor;
  select coalesce(
           nullif(btrim(p.full_name), ''),
           nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''),
           nullif(split_part(p.email, '@', 1), '')
         )
    into label
    from public.profiles p
   where p.id = actor;
  if label is not null then
    new.author := label;
  end if;
  return new;
end;
$$;

revoke all on function public.stamp_caregap_comment_author() from public, anon, authenticated;

drop trigger if exists caregap_comments_stamp_author on public.caregap_comments;
create trigger caregap_comments_stamp_author
  before insert on public.caregap_comments
  for each row execute function public.stamp_caregap_comment_author();

create or replace function public.pin_caregap_comment_author()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.author     := old.author;
  new.author_id  := old.author_id;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists caregap_comments_pin_author on public.caregap_comments;
create trigger caregap_comments_pin_author
  before update on public.caregap_comments
  for each row execute function public.pin_caregap_comment_author();

-- ── Mention notifications on insert and on edit ─────────────────────────────
create or replace function public.emit_caregap_comment_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor    uuid := coalesce(new.author_id, auth.uid());
  new_ids  uuid[];
  patient  text;
  snippet  text;
begin
  if tg_op = 'INSERT' then
    new_ids := new.mention_ids;
  else
    select array(
      select m from unnest(coalesce(new.mention_ids, '{}'::uuid[])) m
      except
      select o from unnest(coalesce(old.mention_ids, '{}'::uuid[])) o
    ) into new_ids;
  end if;

  if coalesce(array_length(new_ids, 1), 0) = 0 then
    return new;
  end if;

  begin
    select m.name into patient
      from public.hedis_members m
     where m.id = new.hedis_member_id
     limit 1;

    snippet := left(regexp_replace(coalesce(new.body, ''), '@', '', 'g'), 160);

    insert into public.notifications
      (recipient_id, actor_id, actor_name, type, title, body)
    select distinct r.id, actor, new.author, 'hedis.comment_mention',
           'You were mentioned in a comment',
           concat_ws(' · ', patient, new.gap_code) ||
             case when patient is null and new.gap_code is null then '' else ': ' end ||
             snippet
      from (
        select p.id
          from unnest(new_ids) as u(id)
          join public.profiles p on p.id = u.id
        union
        -- every profile sharing a picked display name (duplicate rows per
        -- human; see task_mention_ids_migration.sql)
        select s.id
          from unnest(new_ids) as u(id)
          join public.profiles picked on picked.id = u.id
          join public.profiles s
            on nullif(btrim(picked.full_name), '') is not null
           and lower(btrim(s.full_name)) = lower(btrim(picked.full_name))
      ) r
     where r.id is distinct from actor;
  exception when others then
    -- A notification must never be able to break a comment save.
    raise warning 'emit_caregap_comment_notifications skipped: %', sqlerrm;
  end;

  return new;
end;
$$;

revoke all on function public.emit_caregap_comment_notifications() from public, anon, authenticated;

drop trigger if exists caregap_comments_emit_notifications on public.caregap_comments;
create trigger caregap_comments_emit_notifications
  after insert or update of mention_ids on public.caregap_comments
  for each row execute function public.emit_caregap_comment_notifications();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.caregap_comments enable row level security;

drop policy if exists caregap_comments_select on public.caregap_comments;
drop policy if exists caregap_comments_insert_own on public.caregap_comments;
drop policy if exists caregap_comments_update_own on public.caregap_comments;
drop policy if exists caregap_comments_delete_own on public.caregap_comments;

create policy caregap_comments_select
  on public.caregap_comments for select
  to authenticated
  using (true);

create policy caregap_comments_insert_own
  on public.caregap_comments for insert
  to authenticated
  with check (author_id = (select auth.uid()));

create policy caregap_comments_update_own
  on public.caregap_comments for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy caregap_comments_delete_own
  on public.caregap_comments for delete
  to authenticated
  using (author_id = (select auth.uid()));

commit;

-- ── Verify ──────────────────────────────────────────────────────────────────
--   select policyname, cmd from pg_policies where tablename = 'caregap_comments';
--   Expect: _select, _insert_own, _update_own, _delete_own.
--
-- ── Rollback ────────────────────────────────────────────────────────────────
--   drop table if exists public.caregap_comments;
--   drop function if exists public.stamp_caregap_comment_author();
--   drop function if exists public.pin_caregap_comment_author();
--   drop function if exists public.emit_caregap_comment_notifications();
