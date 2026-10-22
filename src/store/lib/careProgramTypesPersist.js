import { supabase } from '../../lib/supabase';
import { programTypeToRow, rowToProgramType } from '../../features/settings/care-program-config/careProgramConfigModel';

// Supabase I/O for supabase/care_program_types_migration.sql.
const MISSING_RE = /care_program_types|does not exist|schema cache/i;

/** `{ types, missing }`: missing is true until the migration has run. */
export async function fetchProgramTypeRows() {
  const { data, error } = await supabase
    .from('care_program_types')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) return { types: [], missing: MISSING_RE.test(error.message || ''), error };
  return { types: (data || []).map(rowToProgramType), missing: false };
}

export async function persistProgramType(type) {
  const { data, error } = await supabase
    .from('care_program_types')
    .upsert(programTypeToRow(type), { onConflict: 'id' })
    .select('*')
    .single();
  return { type: data ? rowToProgramType(data) : null, error };
}

export async function persistProgramTypeDelete(id) {
  const { error } = await supabase.from('care_program_types').delete().eq('id', id);
  return { error };
}
