import { supabase } from '../../lib/supabase';
import { reportPersistFailure } from './reportPersistFailure';

// Supabase I/O for `caregap_reminders` (supabase/caregap_reminders_migration.sql).

const MISSING_TABLE_RE = /caregap_reminders|does not exist|schema cache/i;

export function rowToCaregapReminder(r) {
  return {
    id: r.id,
    memberId: r.hedis_member_id,
    memberName: r.member_name || '',
    gapCode: r.gap_code ?? null,
    title: r.title || '',
    note: r.note || '',
    date: r.remind_date || '',
    time: r.remind_time || '',
    assignee: r.assignee || '',
    status: r.status || 'Pending',
    createdBy: r.created_by || null,
    createdAt: r.created_at,
  };
}

function reminderToRow(r) {
  return {
    id: r.id,
    hedis_member_id: r.memberId,
    member_name: r.memberName || null,
    gap_code: r.gapCode ?? null,
    title: r.title,
    note: r.note || null,
    remind_date: r.date,
    remind_time: r.time || null,
    assignee: r.assignee || null,
    status: r.status || 'Pending',
    created_by: r.createdBy || null,
  };
}

/** @returns {Promise<{ rows: object[], missing: boolean }>} */
export async function fetchCaregapReminderRows() {
  const { data, error } = await supabase
    .from('caregap_reminders')
    .select('*')
    .order('remind_date', { ascending: false });
  if (error) {
    const missing = MISSING_TABLE_RE.test(error.message || '');
    if (!missing) console.warn('fetchCaregapReminders failed:', error.message);
    return { rows: [], missing };
  }
  return { rows: (data || []).map(rowToCaregapReminder), missing: false };
}

/** @returns {Promise<{ missing: boolean }>} */
export async function persistCaregapReminderInsert(reminder) {
  const { error } = await supabase.from('caregap_reminders').insert(reminderToRow(reminder));
  if (!error) return { missing: false };
  if (MISSING_TABLE_RE.test(error.message || '')) return { missing: true };
  reportPersistFailure(`persistCaregapReminderInsert(${reminder.id})`, error);
  return { missing: false };
}

export function persistCaregapReminderUpdate(id, patch) {
  if (!id || !patch) return;
  const row = {};
  if ('title' in patch) row.title = patch.title;
  if ('note' in patch) row.note = patch.note || null;
  if ('date' in patch) row.remind_date = patch.date;
  if ('time' in patch) row.remind_time = patch.time || null;
  if ('assignee' in patch) row.assignee = patch.assignee || null;
  if ('status' in patch) row.status = patch.status;
  if (Object.keys(row).length === 0) return;
  supabase.from('caregap_reminders').update(row).eq('id', id).then(({ error }) => {
    if (error) reportPersistFailure(`persistCaregapReminderUpdate(${id})`, error);
  });
}

export function persistCaregapReminderDelete(id) {
  if (!id) return;
  supabase.from('caregap_reminders').delete().eq('id', id).then(({ error }) => {
    if (error) reportPersistFailure(`persistCaregapReminderDelete(${id})`, error);
  });
}
