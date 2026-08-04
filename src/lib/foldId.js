// Fold Patient ID helpers.
//
// Every patient/worklist table's `id` and `member_id` columns now hold the
// SAME bare-number Fold ID (see supabase/patient_id_unification_migration.sql)
// — there is no separate registry lookup anymore. These helpers just format
// that number for display/search and handle the click-to-copy interaction.

/** Format a Fold ID for display: 10234 → "#10234". No "F-" — bare number
 *  behind the "#" so it stays trivially searchable (strip one char). */
export function formatFoldId(id) {
  return id == null || id === '' ? '—' : `#${id}`;
}

/**
 * True when `query` matches a patient's Fold ID. Accepts a bare number or
 * one with a leading "#"; matches on prefix so "100" finds "#10023".
 */
export function matchesFoldId(id, query) {
  if (id == null) return false;
  const q = (query || '').trim().replace(/^#/, '');
  if (!/^\d{2,}$/.test(q)) return false;
  return String(id).startsWith(q);
}

/** Copy a Fold ID to the clipboard and report success/failure to the
 *  caller so it can show the right toast. */
export async function copyFoldId(id) {
  try {
    await navigator.clipboard.writeText(String(id));
    return true;
  } catch {
    return false;
  }
}
