// PCP Outreach split (pcp-outreach-split): turns the model's per-patient
// drafts into what the review screen shows. The model only drafts; which
// patients exist, which records match, and the suggested patient for a
// flagged part are decided here from the data.

import { matchActions, normalizeDate } from './outreachMatch.js';

const lc = (s) => String(s ?? '').trim().toLowerCase();

/**
 * @param {object} ai        model output: { drafts, unassigned, mentionedNotSelected }
 * @param {object[]} patients selected patients: { key, name, memberId, records: { hccs, icds, dos } }
 * @param {object} [opts]    { allowDos = true }
 * @returns {{ drafts: object[], unassigned: object[], mentionedNotSelected: object[] }}
 *   drafts: one per selected patient, in the order given:
 *     { patientKey, summary, actions, flagged, flagReason, suggestedKey, noDiscussion }
 */
export function buildSplit(ai, patients, { allowDos = true } = {}) {
  const byKey = new Map(patients.map(p => [String(p.key), p]));
  const aiDrafts = new Map();
  for (const d of Array.isArray(ai?.drafts) ? ai.drafts : []) {
    const key = String(d?.patientKey ?? '');
    if (!byKey.has(key) || aiDrafts.has(key)) continue; // never a patient the user didn't select
    aiDrafts.set(key, d);
  }

  // The selected patient with this open DOS, when exactly one has it.
  const patientWithDos = (date) => {
    const want = normalizeDate(date);
    if (!want) return null;
    const hits = patients.filter(p => (p.records?.dos || []).some(d => normalizeDate(d) === want));
    return hits.length === 1 ? String(hits[0].key) : null;
  };

  const drafts = patients.map(p => {
    const key = String(p.key);
    const d = aiDrafts.get(key);
    const summary = typeof d?.summary === 'string' ? d.summary.trim() : '';
    if (!d || !summary) {
      return { patientKey: key, summary: '', actions: [], flagged: false, flagReason: null, suggestedKey: null, noDiscussion: true };
    }
    const flagged = d.confidence === 'low' || !!d.flagged;
    const suggested = flagged ? patientWithDos(d.mentionedDos) : null;
    return {
      patientKey: key,
      summary,
      actions: matchActions(d.actions, p.records, { allowDos }),
      flagged,
      flagReason: flagged ? (String(d.flagReason || '').trim() || 'Low-confidence match') : null,
      purpose: flagged ? (String(d.purpose || '').trim() || null) : null,
      suggestedKey: suggested,
      noDiscussion: false,
    };
  });

  // Parts the model could not tie to any selected patient: suggest one from
  // the DOS mentioned, else leave them for the user to place or mark Unresolved.
  const unassigned = (Array.isArray(ai?.unassigned) ? ai.unassigned : [])
    .filter(u => typeof u?.text === 'string' && u.text.trim())
    .map(u => ({ text: u.text.trim(), purpose: String(u.purpose || '').trim() || null, suggestedKey: patientWithDos(u.mentionedDos) }));

  const selectedNames = new Set(patients.map(p => lc(p.name)));
  const selectedIds = new Set(patients.map(p => lc(p.memberId)).filter(Boolean));
  const seen = new Set();
  const mentionedNotSelected = (Array.isArray(ai?.mentionedNotSelected) ? ai.mentionedNotSelected : [])
    .filter(m => m && typeof m.name === 'string' && m.name.trim())
    .filter(m => !selectedNames.has(lc(m.name)) && !(m.memberId && selectedIds.has(lc(m.memberId))))
    .filter(m => { const k = lc(m.name); if (seen.has(k)) return false; seen.add(k); return true; })
    .map(m => ({ name: m.name.trim(), memberId: m.memberId ? String(m.memberId) : null }));

  return { drafts, unassigned, mentionedNotSelected };
}
