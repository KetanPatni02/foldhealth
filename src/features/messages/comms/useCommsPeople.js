import { useEffect, useMemo } from 'react';
import { useAppStore } from '../../../store/useAppStore';

/** Patients to message or call, and the signed-in user's sending line. */
export function useCommsPeople() {
  const patients = useAppStore(s => s.allPatients);
  const fetchAllPatients = useAppStore(s => s.fetchAllPatients);
  const me = useAppStore(s => s.currentUserProfile);
  const staff = useAppStore(s => s.platformPeople);

  useEffect(() => { fetchAllPatients(); }, [fetchAllPatients]);

  const line = useMemo(() => {
    const number = import.meta.env.VITE_COMMS_LINE_NUMBER || '';
    return { value: 'default', label: [me?.name || 'My line', number].filter(Boolean).join(' '), number };
  }, [me]);

  return { patients: patients || [], me, staff: staff || [], line };
}
