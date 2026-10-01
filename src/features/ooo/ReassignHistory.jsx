import { useEffect } from 'react';
import { Avatar } from '../../components/Avatar/Avatar';
import { Icon } from '../../components/Icon/Icon';
import { RingEmptyState } from '../../components/RingEmptyState/RingEmptyState';
import { useAppStore } from '../../store/useAppStore';
import { formatDate, formatDateTime, initialsOf } from './oooUtils';
import { TYPE_LABELS } from './reassignJobs';
import styles from './reassign.module.css';

/**
 * The Reassign Appointments drawer's History tab: every reassignment job,
 * whoever it was for, newest first. Each opens its Appointment
 * Reassignment Summary.
 */
export function ReassignHistory() {
  const jobs = useAppStore(s => s.reassignmentJobs);
  const fetchJobs = useAppStore(s => s.fetchReassignmentJobs);
  const openSummary = useAppStore(s => s.openReassignmentSummary);
  useEffect(() => { fetchJobs(); }, [fetchJobs]);
  const shown = jobs;

  if (!shown.length) {
    return <RingEmptyState icon="solar:history-linear" label="No reassignments yet" />;
  }
  return (
    <div className={styles.history}>
      {shown.map((j) => {
        const range = j.windowEnd ? `${formatDate(j.windowStart)} – ${formatDate(j.windowEnd)}` : j.windowStart ? `From ${formatDate(j.windowStart)}` : '';
        return (
          <button key={j.id} type="button" className={styles.historyRow} onClick={() => openSummary(j.id)}>
            <Avatar variant="staff" initials={initialsOf(j.fromUser)} size="M" />
            <span className={styles.historyText}>
              <span className={styles.historyMain}>{j.fromUser} • {TYPE_LABELS[j.type] || 'Reassignment'}{range ? ` • ${range}` : ''}</span>
              <span className={styles.historySub}>
                {j.results.length} Appointments • {j.reassignedCount} Reassigned • {j.cancelledCount} Cancelled • {j.conflictingCount} Conflicting • {j.failedCount} Failed
              </span>
              <span className={styles.historySub}>Run {formatDateTime(j.createdAt)}{j.createdBy ? ` by ${j.createdBy}` : ''}</span>
            </span>
            <Icon name="solar:alt-arrow-right-linear" size={16} color="var(--neutral-300)" />
          </button>
        );
      })}
    </div>
  );
}
