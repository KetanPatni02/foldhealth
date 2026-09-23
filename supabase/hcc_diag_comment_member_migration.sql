-- Scope DiagPanel comments to a patient.
-- Before this column existed, comments were org-wide, so every patient's
-- DiagPanel showed (and counted) every comment. The app writes the HCC
-- worklist member id here on insert and filters the Comments tab by it.
-- Existing rows stay NULL and continue to show on every patient.
alter table public.hcc_diag_comments
  add column if not exists hcc_member_id text;

create index if not exists hcc_diag_comments_hcc_member_id_idx
  on public.hcc_diag_comments (hcc_member_id);
