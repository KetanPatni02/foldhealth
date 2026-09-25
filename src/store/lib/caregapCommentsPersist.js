import { supabase } from '../../lib/supabase';
import { reportPersistFailure } from './reportPersistFailure';

// Supabase I/O for `caregap_comments` (supabase/caregap_comments_migration.sql).
// The DB stamps author / author_id and sends mention notifications; the
// client only supplies the body and the mentioned profile ids.

const MISSING_TABLE_RE = /caregap_comments|does not exist|schema cache/i;

export function rowToCaregapComment(r) {
  return {
    id: r.id,
    memberId: r.hedis_member_id,
    gapCode: r.gap_code ?? null,
    author: r.author ?? null,
    authorId: r.author_id ?? null,
    body: r.body || '',
    mentionIds: r.mention_ids || [],
    edited: !!r.edited,
    createdAt: r.created_at,
  };
}

/** @returns {Promise<{ rows: object[], missing: boolean }>} */
export async function fetchCaregapCommentRows() {
  const { data, error } = await supabase
    .from('caregap_comments')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    const missing = MISSING_TABLE_RE.test(error.message || '');
    if (!missing) console.warn('fetchCaregapComments failed:', error.message);
    return { rows: [], missing };
  }
  return { rows: (data || []).map(rowToCaregapComment), missing: false };
}

/** @returns {Promise<{ missing: boolean }>} `missing` = table not created yet. */
export async function persistCaregapCommentInsert(c) {
  const { error } = await supabase.from('caregap_comments').insert({
    id: c.id,
    hedis_member_id: c.memberId,
    gap_code: c.gapCode ?? null,
    author: c.author ?? null,
    author_id: c.authorId ?? null,
    body: c.body,
    mention_ids: c.mentionIds?.length ? c.mentionIds : null,
  });
  if (!error) return { missing: false };
  if (MISSING_TABLE_RE.test(error.message || '')) return { missing: true };
  reportPersistFailure(`persistCaregapCommentInsert(${c.id})`, error);
  return { missing: false };
}

export function persistCaregapCommentUpdate(id, body, mentionIds) {
  if (!id) return;
  supabase
    .from('caregap_comments')
    .update({ body, edited: true, mention_ids: mentionIds?.length ? mentionIds : null })
    .eq('id', id)
    .select('id')
    .then(({ data, error }) => {
      if (error) return reportPersistFailure(`persistCaregapCommentUpdate(${id})`, error);
      // RLS scopes writes to the author, so 0 rows means "not yours" (or gone).
      if (!data || data.length === 0) reportPersistFailure(`persistCaregapCommentUpdate(${id})`, { message: 'affected 0 rows (not the author, or comment removed)' });
    });
}

export function persistCaregapCommentDelete(id) {
  if (!id) return;
  supabase
    .from('caregap_comments')
    .delete()
    .eq('id', id)
    .select('id')
    .then(({ data, error }) => {
      if (error) return reportPersistFailure(`persistCaregapCommentDelete(${id})`, error);
      if (!data || data.length === 0) reportPersistFailure(`persistCaregapCommentDelete(${id})`, { message: 'affected 0 rows (not the author, or already removed)' });
    });
}
