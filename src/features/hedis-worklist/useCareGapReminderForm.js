import { useState } from 'react';

export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const EMPTY = { title: '', date: '', time: '', assignee: '', note: '' };

/**
 * State for the Care Gap "Set Reminder" pane. The host owns it so the
 * pane header's Save can gate on `canSave`. `startEdit` loads an existing
 * reminder; `reset(defaults)` clears it (e.g. assignee = current user).
 */
export function useCareGapReminderForm() {
  const [values, setValues] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const set = (key) => (value) => setValues(v => ({ ...v, [key]: value }));

  const reset = (defaults = {}) => {
    setEditingId(null);
    setValues({ ...EMPTY, ...defaults });
  };
  const startEdit = (reminder) => {
    setEditingId(reminder.id);
    setValues({
      title: reminder.title || '',
      date: reminder.date || '',
      time: reminder.time || '',
      assignee: reminder.assignee || '',
      note: reminder.note || '',
    });
  };

  // Reminders are for today or later (same rule as booking appointments).
  const canSave = !!(values.title.trim() && values.date && values.date >= todayIso());

  return { values, set, editingId, reset, startEdit, canSave };
}
