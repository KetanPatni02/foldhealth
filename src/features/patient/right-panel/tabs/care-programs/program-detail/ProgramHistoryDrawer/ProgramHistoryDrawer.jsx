import { useEffect, useMemo } from 'react';
import { Drawer } from '../../../../../../../components/Drawer/Drawer';
import { CardSkeleton } from '../../../../../../../components/CardSkeleton/CardSkeleton';
import { EmptyState } from '../../../../../../../components/EmptyState/EmptyState';
import { useAppStore } from '../../../../../../../store/useAppStore';
import { ProgramActivityDay } from '../../../care-management/ProgramActivityCard/ProgramActivityCard.jsx';
import { groupProgramActivity } from '../../../care-management/programActivity';
import { useProgramHistory } from './useProgramHistory';
import styles from './ProgramHistoryDrawer.module.css';

/**
 * History for one care program: its slice of the Program Activity Log.
 * `patientId` when opened outside that patient's page.
 */
export function ProgramHistoryDrawer({ program, patientId: forPatientId = null, onClose }) {
  const fetchPatientProgramActivity = useAppStore(s => s.fetchPatientProgramActivity);
  const { patientId, entries, loading } = useProgramHistory(program, forPatientId);

  useEffect(() => {
    if (patientId) fetchPatientProgramActivity(patientId, { force: true });
  }, [patientId, fetchPatientProgramActivity]);

  const months = useMemo(() => groupProgramActivity(entries), [entries]);

  // Opened from the While You Were Away summary (store.focusActivity, kind
  // 'program', id "patient:code"): the entries it refers to stay highlighted
  // for 3s, by dates or as the newest few.
  const focus = useAppStore(s => s.activityFocus);
  const clearFocus = useAppStore(s => s.clearActivityFocus);
  const focused = !loading && focus?.kind === 'program' && focus.id === `${forPatientId ?? patientId}:${program.code}`;
  useEffect(() => {
    if (!focused) return undefined;
    const t = setTimeout(clearFocus, 3000);
    return () => clearTimeout(t);
  }, [focused, clearFocus]);
  const pointed = useMemo(() => {
    if (!focused) return null;
    const list = focus.latest ? entries.slice(0, focus.latest)
      : entries.filter(e => (!focus.from || new Date(e.occurredAt) >= new Date(focus.from)) && (!focus.to || new Date(e.occurredAt) <= new Date(focus.to)));
    return new Set(list.map(e => e.id));
  }, [focused, focus, entries]);
  const isPointed = pointed ? (item => pointed.has(item.id)) : undefined;

  return (
    <Drawer title={`${program.name} History`} onClose={onClose} bodyClassName={styles.body}>
      {loading ? (
        <CardSkeleton count={4} />
      ) : months.length === 0 ? (
        <EmptyState icon="solar:history-linear" title="No activity for this program yet" />
      ) : (
        months.map(month => (
          <section key={month.key} className={styles.month}>
            <h3 className={styles.monthTitle}>{month.label}</h3>
            {month.days.map(day => <ProgramActivityDay key={day.key} day={day} isPointed={isPointed} />)}
          </section>
        ))
      )}
    </Drawer>
  );
}
