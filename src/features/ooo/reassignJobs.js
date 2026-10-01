/**
 * Reassignment jobs: what a confirmed plan did, appointment by appointment.
 * buildJob works the outcome out (pure); the store carries it out on
 * `appointments` and saves it (reassignment_jobs).
 */
import { findConflict } from './reassignUtils';

// The bits of an appointment the summary shows, kept on the job so it
// still reads right after the appointment has moved or been cancelled.
export const snapshot = (a) => ({
  patientName: a.patient_name || 'Appointment',
  date: a.date,
  timeStart: a.time_start,
  timeEnd: a.time_end,
  type: a.appointment_type_name || '',
  location: (a.location || '').trim() || 'No Department',
});

/**
 * The job for a plan. Each planned appointment ends up:
 *   - failed ("Unable to Find Appointment") when the EHR no longer has it;
 *   - cancelled;
 *   - reassigned, with `conflict` set when the covering provider already
 *     has an overlapping appointment (it still goes ahead).
 * Appointments moved earlier in the same job count when checking clashes.
 */
export function buildJob({ fromUser, fromUserRole, type, window, oooRecordId, plan, appointments, everyone, createdBy, now = new Date() }) {
  const id = `rj-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`;
  const calendar = [...(everyone || [])];
  const results = [];
  (appointments || []).forEach((a) => {
    const p = plan[a.id];
    if (!p) return;
    const base = { appointmentId: a.id, appointment: snapshot(a) };
    if (a.ehr_missing) { results.push({ ...base, outcome: 'failed', to: p.to || null, reason: 'Unable to Find Appointment' }); return; }
    if (p.action === 'cancel') { results.push({ ...base, outcome: 'cancelled' }); return; }
    const clash = findConflict(a, p.to, calendar);
    results.push({ ...base, outcome: 'reassigned', to: p.to, conflict: clash ? { appointmentId: clash.id, appointment: snapshot(clash) } : null });
    calendar.push({ ...a, primary_user: p.to });
  });
  const count = (o) => results.filter(r => r.outcome === o).length;
  return {
    id,
    fromUser,
    fromUserRole: fromUserRole || null,
    type,
    windowStart: window && Number.isFinite(window.from) ? new Date(window.from).toISOString() : null,
    windowEnd: window && Number.isFinite(window.to) ? new Date(window.to).toISOString() : null,
    oooRecordId: oooRecordId || null,
    status: 'done',
    reassignedCount: count('reassigned'),
    cancelledCount: count('cancelled'),
    conflictingCount: results.filter(r => r.conflict).length,
    failedCount: count('failed'),
    results,
    createdBy: createdBy || null,
    createdAt: now.toISOString(),
  };
}

export const jobToRow = (j) => ({
  id: j.id,
  from_user: j.fromUser,
  from_user_role: j.fromUserRole,
  type: j.type,
  window_start: j.windowStart,
  window_end: j.windowEnd,
  ooo_record_id: j.oooRecordId,
  status: j.status,
  reassigned_count: j.reassignedCount,
  cancelled_count: j.cancelledCount,
  conflicting_count: j.conflictingCount,
  failed_count: j.failedCount,
  results: j.results,
  created_by: j.createdBy,
  created_at: j.createdAt,
});

export const rowToJob = (r) => ({
  id: r.id,
  fromUser: r.from_user,
  fromUserRole: r.from_user_role,
  type: r.type,
  windowStart: r.window_start,
  windowEnd: r.window_end,
  oooRecordId: r.ooo_record_id,
  status: r.status,
  reassignedCount: r.reassigned_count,
  cancelledCount: r.cancelled_count,
  conflictingCount: r.conflicting_count,
  failedCount: r.failed_count,
  results: Array.isArray(r.results) ? r.results : [],
  createdBy: r.created_by,
  createdAt: r.created_at,
});

export const TYPE_LABELS = { ooo: 'Out of Office Reassignment', permanent: 'Permanent Reassignment', other: 'One-time Reassignment' };
