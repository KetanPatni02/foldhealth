import { useEffect, useMemo } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import { CARE_PROGRAM_CATALOG } from '../../patient/data/careProgramCatalog';
import { dynamicOptions } from '../lib/conditionFields';

/**
 * Option lists drawn from data rather than the field definitions: member
 * records (tags, locations, programs, employers, payers, plan codes, PCPs),
 * plus population groups, appointment types and the practice's staff.
 */
export function useDynamicOptions() {
  const members = useAppStore(s => s.automationMembers);
  const popGroups = useAppStore(s => s.popGroups);
  const platformUsers = useAppStore(s => s.platformUsers);
  const appointmentTypes = useAppStore(s => s.appointmentTypes);
  const fetchAutomationMembers = useAppStore(s => s.fetchAutomationMembers);
  const fetchPopGroups = useAppStore(s => s.fetchPopGroups);
  const fetchPlatformUsers = useAppStore(s => s.fetchPlatformUsers);
  const fetchAppointmentTypes = useAppStore(s => s.fetchAppointmentTypes);
  useEffect(() => { fetchAutomationMembers(); }, [fetchAutomationMembers]);
  useEffect(() => { fetchPopGroups?.(); fetchPlatformUsers?.(); fetchAppointmentTypes?.(); }, [fetchPopGroups, fetchPlatformUsers, fetchAppointmentTypes]);

  return useMemo(() => {
    const base = dynamicOptions(members, CARE_PROGRAM_CATALOG.map(p => p.code));
    const names = new Set(base.providers.map(o => o.value));
    const staff = (platformUsers || []).map(u => u.name).filter(n => n && !names.has(n));
    return {
      ...base,
      popGroups: (popGroups || []).map(g => ({ value: g.name, label: g.name })),
      appointmentTypes: (appointmentTypes || []).map(t => t.name).filter(Boolean).map(n => ({ value: n, label: n })),
      providers: [...base.providers, ...staff.map(n => ({ value: n, label: n }))]
        .sort((a, b) => a.label.localeCompare(b.label)),
    };
  }, [members, popGroups, platformUsers, appointmentTypes]);
}
