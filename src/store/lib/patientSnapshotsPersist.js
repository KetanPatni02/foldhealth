import { supabase } from '../../lib/supabase';
import { snapshotFromRow } from '../../lib/patientSnapshot';

// Supabase I/O for supabase/patient_snapshots_migration.sql.

const MISSING_RE = /patient_snapshots|does not exist|schema cache/i;

/** @returns {Promise<{ snapshot: object|null, missing: boolean }>} */
export async function fetchPatientSnapshotRow(patientId) {
  const { data, error } = await supabase.from('patient_snapshots').select('*').eq('patient_id', String(patientId)).maybeSingle();
  if (error) {
    const missing = MISSING_RE.test(error.message || '');
    if (!missing) console.warn('fetchPatientSnapshot failed:', error.message);
    return { snapshot: null, missing };
  }
  return { snapshot: data ? snapshotFromRow(data) : null, missing: false };
}
