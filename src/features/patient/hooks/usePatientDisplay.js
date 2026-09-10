import { useMemo } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { resolvePatientDisplay } from '../../../lib/patientDisplay';

/** Resolved name / dob / age / gender / language for a patient row. */
export function usePatientDisplay(patient) {
  const patientId = patient?.id;
  const p360Profile = useAppStore((s) => (patientId ? s.p360ProfilesById[patientId] : null));
  const p = p360Profile?.patient_id === patientId ? p360Profile : null;

  return useMemo(
    () => resolvePatientDisplay(patient, p),
    [patient, p],
  );
}
