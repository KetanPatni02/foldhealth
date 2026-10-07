import { useMemo, useState } from 'react';
import { parseLocalDate } from '../../../lib/localDate';
import { CIS_ANTIGENS, antigensForImmunization, evaluateCis } from './cisRules';

const EMPTY_DRAFT = { dates: {}, removed: [], added: [], notes: {} };
const ANTIGEN = Object.fromEntries(CIS_ANTIGENS.map(a => [a.key, a]));
const NEW_PREFIX = 'new-';

const pad = (n) => String(n).padStart(2, '0');
/** Date → YYYY-MM-DD (DatePicker value). */
export const toIso = (d) => (d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '');
/** YYYY-MM-DD → MM/DD/YYYY (patient_immunizations.date_administered). */
export const isoToMdy = (iso) => {
  const [y, m, d] = String(iso || '').split('-');
  return y && m && d ? `${m}/${d}/${y}` : '';
};
const isNew = (id) => String(id).startsWith(NEW_PREFIX);

/**
 * Draft + live evaluation for the CIS-CMB10 Vaccine Calendar. Edits stay
 * local until save(): new doses (a date entered on a planned row), changed
 * dates, removed doses and per-dose notes.
 */
export function useCisTracker({ immunizations, savedNotes, measurementYear, dob }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [seq, setSeq] = useState(0);

  const effective = useMemo(() => {
    const removed = new Set(draft.removed);
    const kept = (immunizations || [])
      .filter(r => !removed.has(r.id))
      .map(r => (draft.dates[r.id] ? { ...r, dateAdministered: isoToMdy(draft.dates[r.id]) } : r));
    const added = draft.added.map(a => ({
      id: a.tempId,
      title: ANTIGEN[a.antigenKey].record.title,
      code: ANTIGEN[a.antigenKey].record.code,
      dateAdministered: isoToMdy(a.date),
    }));
    return [...kept, ...added];
  }, [immunizations, draft]);

  const result = useMemo(
    () => evaluateCis({ dob, immunizations: effective, measurementYear }),
    [dob, effective, measurementYear],
  );

  const noteKey = (antigenKey, number) => `${antigenKey}:${number}`;
  const noteFor = (antigenKey, number) => {
    const k = noteKey(antigenKey, number);
    return k in draft.notes ? draft.notes[k] : (savedNotes?.[k]?.note || '');
  };
  const setNote = (antigenKey, number, text) => setDraft(d => ({ ...d, notes: { ...d.notes, [noteKey(antigenKey, number)]: text } }));

  /** Date a dose: records a planned one, or changes a given one's date. */
  const setDoseDate = (antigenKey, row, iso) => {
    if (!iso) return;
    const id = row.record?.id;
    if (!id) {
      setDraft(d => ({ ...d, added: [...d.added, { tempId: `${NEW_PREFIX}${antigenKey}-${seq}`, antigenKey, date: iso }] }));
      setSeq(n => n + 1);
    } else if (isNew(id)) {
      setDraft(d => ({ ...d, added: d.added.map(a => (a.tempId === id ? { ...a, date: iso } : a)) }));
    } else {
      setDraft(d => ({ ...d, dates: { ...d.dates, [id]: iso } }));
    }
  };

  /**
   * What clearing a given dose's date would remove. `existing` means it is
   * already in the patient's immunization history (removal needs
   * confirming); `shared` names other vaccines the same record counts for.
   */
  const removalFor = (antigenKey, row) => {
    const id = row.record?.id;
    if (!id) return null;
    if (isNew(id)) return { tempId: id, existing: false };
    const shared = antigensForImmunization(row.record).filter(k => k !== antigenKey).map(k => ANTIGEN[k].label);
    return { id, row, shared, existing: true };
  };
  const removeDose = ({ tempId, id }) => setDraft(d => (tempId
    ? { ...d, added: d.added.filter(a => a.tempId !== tempId) }
    : { ...d, removed: [...d.removed, id] }));

  const original = useMemo(() => Object.fromEntries((immunizations || []).map(r => [r.id, toIso(parseLocalDate(r.dateAdministered))])), [immunizations]);
  const dateChanges = Object.entries(draft.dates).filter(([id, iso]) => original[id] !== iso && !draft.removed.includes(id));
  const noteChanges = Object.entries(draft.notes).filter(([k, text]) => (savedNotes?.[k]?.note || '') !== text.trim());
  const dirty = dateChanges.length > 0 || draft.removed.length > 0 || draft.added.length > 0 || noteChanges.length > 0;

  /** Payload for saveCisTracker, plus a one-line activity summary. */
  const buildSave = () => {
    const parts = [];
    if (draft.added.length) {
      const counts = {};
      draft.added.forEach(a => { counts[a.antigenKey] = (counts[a.antigenKey] || 0) + 1; });
      parts.push(`Doses recorded: ${Object.entries(counts).map(([k, n]) => `${ANTIGEN[k].label} ×${n}`).join(', ')}`);
    }
    if (dateChanges.length) parts.push(`${dateChanges.length} dose date${dateChanges.length === 1 ? '' : 's'} changed`);
    if (draft.removed.length) parts.push(`${draft.removed.length} dose${draft.removed.length === 1 ? '' : 's'} removed`);
    if (noteChanges.length) parts.push(`${noteChanges.length} note${noteChanges.length === 1 ? '' : 's'} updated`);
    return {
      inserts: draft.added.map(a => ({ ...ANTIGEN[a.antigenKey].record, dateAdministered: isoToMdy(a.date) })),
      updates: dateChanges.map(([id, iso]) => ({ id, dateAdministered: isoToMdy(iso) })),
      deletes: draft.removed,
      notes: noteChanges.map(([k, text]) => {
        const [antigenKey, n] = k.split(':');
        return { antigenKey, doseNumber: Number(n), note: text.trim() };
      }),
      summary: parts.join('. '),
    };
  };

  return {
    result,
    dirty,
    setDoseDate,
    removalFor,
    removeDose,
    noteFor,
    setNote,
    buildSave,
    discard: () => setDraft(EMPTY_DRAFT),
  };
}
