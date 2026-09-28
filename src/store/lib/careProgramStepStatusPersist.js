import { supabase } from '../../lib/supabase';
import { reportPersistFailure } from './reportPersistFailure';

// Supabase I/O for supabase/care_program_step_status_migration.sql.

const MISSING_RE = /care_program_step_status|does not exist|schema cache/i;

/** @returns {Promise<{ rows: object[], missing: boolean }>} */
export async function fetchStepStatusRows(patientProgramId) {
  const { data, error } = await supabase
    .from('care_program_step_status')
    .select('step_id, status, updated_by, updated_at')
    .eq('patient_program_id', patientProgramId);
  if (error) {
    const missing = MISSING_RE.test(error.message || '');
    if (!missing) console.warn('fetchProgramStepStatus failed:', error.message);
    return { rows: [], missing };
  }
  return {
    rows: (data || []).map(r => ({ stepId: r.step_id, status: r.status, updatedBy: r.updated_by, updatedAt: r.updated_at })),
    missing: false,
  };
}

/** status null clears the step back to not started. */
export async function persistStepStatus(patientProgramId, step, status, updatedBy) {
  const q = status
    ? supabase.from('care_program_step_status').upsert({
      patient_program_id: patientProgramId,
      step_id: step.id,
      step_name: step.name || null,
      status,
      updated_by: updatedBy || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'patient_program_id,step_id' })
    : supabase.from('care_program_step_status').delete().eq('patient_program_id', patientProgramId).eq('step_id', step.id);
  const { error } = await q;
  if (!error) return { missing: false };
  if (MISSING_RE.test(error.message || '')) return { missing: true };
  reportPersistFailure(`persistStepStatus(${patientProgramId}, ${step.id})`, error);
  return { missing: false };
}
