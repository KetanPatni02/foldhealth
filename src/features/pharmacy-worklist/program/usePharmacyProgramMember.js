import { useEffect } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { findPharmacyMember } from '../../../store/slices/pharmacyWorklistSlice';

// The pharmacy worklist row behind the open patient profile, loading the
// worklist when the profile was reached some other way (deep link, search).
export function usePharmacyProgramMember() {
  const patientId = useAppStore(s => s.selectedPatientId);
  const members = useAppStore(s => s.pharmacyWorklistMembers);
  const fetchMembers = useAppStore(s => s.fetchPharmacyWorklistMembers);
  useEffect(() => { fetchMembers(); }, [fetchMembers]);
  return findPharmacyMember(members, patientId);
}
