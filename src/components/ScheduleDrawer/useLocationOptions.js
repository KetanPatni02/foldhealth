import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { LOCATION_OPTIONS } from './scheduleDrawerConstants';

/**
 * Appointment locations: the practice locations from Settings → Account →
 * Locations (also each staff member's departments), so an appointment's
 * location, the calendar's Location filter and reassignment's departments
 * all use the same names. Falls back to the built-in list until loaded.
 */
export function useLocationOptions() {
  const locations = useAppStore(s => s.practiceLocations);
  const fetched = useAppStore(s => s.practiceLocationsFetched);
  const fetchLocations = useAppStore(s => s.fetchPracticeLocations);
  useEffect(() => { if (!fetched) fetchLocations?.(); }, [fetched, fetchLocations]);
  return locations?.length ? locations.map(l => l.name) : LOCATION_OPTIONS;
}
