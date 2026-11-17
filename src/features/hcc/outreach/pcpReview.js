// PCP Outreach review: the per-patient drafts the user checks before save.
// Pure state helpers so the rules are testable apart from the drawer.
//
// state: {
//   drafts: [{ patientKey, name, summary, actions, flagged, flagReason, purpose,
//              suggestedKey, noDiscussion, category, outcome }],
//   unassigned: [{ text, purpose, suggestedKey }],
//   mentioned: [{ name, memberId }],
//   unresolved: [{ text, reason }],      // stays on the PCP outreach record only
// }

const joinText = (a, b) => [a, b].filter(s => s && s.trim()).join('\n\n');
const nameOf = (state, key) => state.drafts.find(d => d.patientKey === key)?.name || 'this patient';

/** Review state from the split, with the outreach's category and outcome on every patient. */
export function initReview({ split, patients, category, outcome }) {
  const byKey = new Map(patients.map(p => [p.key, p]));
  const drafts = (split?.drafts?.length ? split.drafts : patients.map(p => ({ patientKey: p.key, summary: '', actions: [], noDiscussion: false })))
    .filter(d => byKey.has(d.patientKey))
    .map(d => ({
      flagged: false, flagReason: null, purpose: null, suggestedKey: null, noDiscussion: false, actions: [],
      ...d,
      name: byKey.get(d.patientKey).name,
      category,
      outcome,
    }));
  return {
    drafts,
    unassigned: split?.unassigned || [],
    mentioned: split?.mentionedNotSelected || [],
    unresolved: [],
  };
}

const patchDraft = (state, key, patch) => ({
  ...state,
  drafts: state.drafts.map(d => (d.patientKey === key ? { ...d, ...(typeof patch === 'function' ? patch(d) : patch) } : d)),
});

/** Keep a flagged part with the patient it was drafted for. */
export const confirmFlag = (state, key) => patchDraft(state, key, { flagged: false });

/** Move a draft's content to another selected patient; the source is left empty. */
export function moveDraft(state, fromKey, toKey) {
  if (fromKey === toKey) return confirmFlag(state, fromKey);
  const from = state.drafts.find(d => d.patientKey === fromKey);
  if (!from) return state;
  let next = patchDraft(state, toKey, d => ({
    summary: joinText(d.summary, from.summary),
    actions: [...d.actions, ...from.actions],
    noDiscussion: false,
  }));
  next = patchDraft(next, fromKey, { summary: '', actions: [], flagged: false, noDiscussion: true });
  return next;
}

/** Content nobody can be sure about: off every patient, kept on the PCP outreach. */
export function unresolveDraft(state, key) {
  const d = state.drafts.find(x => x.patientKey === key);
  if (!d) return state;
  const next = patchDraft(state, key, { summary: '', actions: [], flagged: false, noDiscussion: true });
  return { ...next, unresolved: [...next.unresolved, { text: d.summary, reason: d.flagReason }] };
}

/** Put an unassigned part on a patient. */
export function placeUnassigned(state, index, key) {
  const u = state.unassigned[index];
  if (!u) return state;
  const next = patchDraft(state, key, d => ({ summary: joinText(d.summary, u.text), noDiscussion: false }));
  return { ...next, unassigned: next.unassigned.filter((_, i) => i !== index) };
}

export function unresolveUnassigned(state, index) {
  const u = state.unassigned[index];
  if (!u) return state;
  return { ...state, unassigned: state.unassigned.filter((_, i) => i !== index), unresolved: [...state.unresolved, { text: u.text, reason: u.purpose }] };
}

/** A removed patient gets no entry. */
export const removePatient = (state, key) => ({ ...state, drafts: state.drafts.filter(d => d.patientKey !== key) });

/** Add a patient from the PCP's list (mentioned but not selected, or searched). */
export function addPatient(state, patient, { category, outcome }) {
  if (state.drafts.some(d => d.patientKey === patient.key)) return state;
  return {
    ...state,
    drafts: [...state.drafts, {
      patientKey: patient.key, name: patient.name, summary: '', actions: [], flagged: false, flagReason: null,
      purpose: null, suggestedKey: null, noDiscussion: false, category, outcome,
    }],
    mentioned: state.mentioned.filter(m => m.name.toLowerCase() !== patient.name.toLowerCase()),
  };
}

export const setDraftField = (state, key, field, value) => patchDraft(state, key, { [field]: value });

/** What still blocks Save, naming the patient or part, or null. */
export function reviewProblem(state) {
  if (!state.drafts.length) return 'Keep at least one patient.';
  const flagged = state.drafts.find(d => d.flagged);
  if (flagged) return `Confirm, move or mark Unresolved the flagged part for ${flagged.name}.`;
  if (state.unassigned.length) return 'Place each unassigned part on a patient or mark it Unresolved.';
  const empty = state.drafts.find(d => !d.summary.trim());
  if (empty) return `Add a summary for ${empty.name}, or remove them.`;
  const noOutcome = state.drafts.find(d => d.category !== 'Note' && !d.outcome);
  if (noOutcome) return `Select an outcome for ${noOutcome.name}.`;
  return null;
}

export const suggestedName = (state, key) => (key ? nameOf(state, key) : null);
