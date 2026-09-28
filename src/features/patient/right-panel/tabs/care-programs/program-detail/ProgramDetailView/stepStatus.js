// Care Program step status, per patient + program enrollment.
//
// A step is 'completed' / 'in_progress' from the patient's real records where
// one exists (care plan, tasks, files, med-rec sign-off, appointments), or
// from a status someone set on the step (Reviewed / Skip), saved in
// care_program_step_status. Nothing is completed just because the step list
// says so.

export const STEP_STATUS = {
  pending: 'pending',
  inProgress: 'in_progress',
  completed: 'completed',
  skipped: 'skipped',
};

const DONE_TASK = /^(completed|done|closed)$/i;
const DONE_APPT = /^(completed|checked in|checked-in|attended)$/i;
const OPEN_APPT = /^(scheduled|booked|pending|confirmed|rescheduled)$/i;

// What the patient's records say about a step: 'completed', 'in_progress', or
// null when the step has no record behind it (manual status only).
function fromRecords(step, ctx) {
  const name = step.name || '';
  if (name === 'Care Plan') {
    const cp = ctx.carePlan;
    if (cp?.plan?.signedAt) return STEP_STATUS.completed;
    if ((cp?.goals || []).length || (cp?.interventions || []).length) return STEP_STATUS.inProgress;
    return null;
  }
  if (name === 'Program Related Task') {
    if (!ctx.tasks.length) return null;
    return ctx.tasks.every(t => DONE_TASK.test(t.status || '')) ? STEP_STATUS.completed : STEP_STATUS.inProgress;
  }
  if (name === 'Program Related Files' || name === 'Program Documents' || name === 'Documents') {
    return ctx.documents.length ? STEP_STATUS.completed : null;
  }
  if (name === 'Medication Reconciliation' || name === 'Medication Review') {
    return ctx.program?.medReconSignedAt ? STEP_STATUS.completed : null;
  }
  if (/appointment/i.test(name)) {
    // "ICT Appointment" needs an ICT visit; a plain "Appointment" step takes any.
    const wantIct = /ict/i.test(name);
    const appts = ctx.appointments.filter(a => !wantIct || /ict|interdisciplinary/i.test(`${a.appointment_type_name || ''} ${a.title || ''}`));
    if (appts.some(a => DONE_APPT.test(a.status || ''))) return STEP_STATUS.completed;
    if (appts.some(a => OPEN_APPT.test(a.status || '') || !a.status)) return STEP_STATUS.inProgress;
    return null;
  }
  return null;
}

/**
 * @param {object} step – { id, name }
 * @param {object} ctx  – { manual: {[stepId]: {status}}, carePlan, tasks[], documents[], program, appointments[] }
 * @returns {{ status: string, source: 'records'|'manual'|null }}
 */
export function deriveStepStatus(step, ctx) {
  const manual = ctx.manual?.[step.id]?.status || null;
  const records = fromRecords(step, ctx);
  if (records === STEP_STATUS.completed) return { status: STEP_STATUS.completed, source: 'records' };
  if (manual === STEP_STATUS.completed || manual === STEP_STATUS.skipped) return { status: manual, source: 'manual' };
  if (records === STEP_STATUS.inProgress) return { status: STEP_STATUS.inProgress, source: 'records' };
  return { status: STEP_STATUS.pending, source: null };
}

// Program progress: completed or skipped steps over all steps.
export function programProgressOf(flatSteps) {
  if (!flatSteps.length) return 0;
  const done = flatSteps.filter(s => s.status === STEP_STATUS.completed || s.status === STEP_STATUS.skipped).length;
  return Math.round((done / flatSteps.length) * 100);
}
