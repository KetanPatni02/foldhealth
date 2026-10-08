import { useState } from 'react';
import { CIS_ANTIGENS, CIS_DOSE_STATUS } from './cisRules';
import { todayIso } from '../useCareGapReminderForm';

const EMPTY = { date: '', time: '', provider: '', doses: [], note: '' };
const LABEL = Object.fromEntries(CIS_ANTIGENS.map(a => [a.key, a.label]));
// Preselected on a new appointment: the doses that need giving now.
const PRESELECT = [CIS_DOSE_STATUS.overdue, CIS_DOSE_STATUS.dueNow, CIS_DOSE_STATUS.pending];

/** "IPV dose 2, Hep B dose 3" from ['ipv:2', 'hepb:3']. */
export const doseText = (keys) => keys.map(k => {
  const [key, n] = k.split(':');
  return `${LABEL[key] || key} dose ${n}`;
}).join(', ');

/**
 * State for the Care Gap "Schedule Vaccine Appointment" pane (CIS-CMB10),
 * held by the drawer so the pane header's Save can gate on `canSave`.
 * `reset(result)` starts a new one with due doses ticked; `startEdit`
 * loads an existing appointment.
 */
export function useCisAppointmentForm() {
  const [values, setValues] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const set = (key) => (value) => setValues(v => ({ ...v, [key]: value }));
  const toggleDose = (key, on) => setValues(v => ({ ...v, doses: on ? [...v.doses, key] : v.doses.filter(k => k !== key) }));

  const reset = (result) => {
    setEditing(null);
    const due = (result?.antigens || []).flatMap(a => a.rows
      .filter(r => r.kind !== 'given' && PRESELECT.includes(r.status))
      .map(r => `${a.key}:${r.number}`));
    setValues({ ...EMPTY, doses: due });
  };
  const startEdit = (appt) => {
    setEditing(appt);
    setValues({ date: appt.date, time: appt.time || '', provider: appt.provider || '', doses: appt.doses, note: appt.note || '' });
  };

  // New appointments are for today or later; an existing one may be past.
  const canSave = !!values.date && values.doses.length > 0 && (!!editing || values.date >= todayIso());
  const payload = () => ({
    appt: { id: editing?.id, date: values.date, time: values.time, provider: values.provider.trim(), doses: values.doses, note: values.note.trim() },
    doseText: doseText(values.doses),
  });

  return { values, set, toggleDose, editing, reset, startEdit, canSave, payload };
}
