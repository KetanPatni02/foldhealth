import { useMemo } from 'react';
import { useAppStore } from '../../../../../../../store/useAppStore';
import { resolvePatientStoreId } from '../../../../../../../lib/resolvePatientStoreId';
import { carePlanActivityEntries, filterProgramActivity } from '../../../care-management/programActivity';

/** This program's own entries from the patient's Program Activity Log, newest first. */
export function useProgramHistory(program) {
  const patientId = useAppStore(s => resolvePatientStoreId(s, s.selectedPatientId));
  const activity = useAppStore(s => s.patientProgramActivity[patientId]);
  const carePlanSource = useAppStore(s => s.patientCarePlanActivitySource[patientId]);
  const loading = useAppStore(s => !!s.patientProgramActivityLoading[patientId] && !s.patientProgramActivityLoadedFor[patientId]);

  const entries = useMemo(() => filterProgramActivity([
    ...(activity || []),
    ...carePlanActivityEntries(carePlanSource?.audit, carePlanSource?.versions, [program]),
  ], { programs: [program.code] })
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)), [activity, carePlanSource, program]);

  return { patientId, entries, loading };
}
