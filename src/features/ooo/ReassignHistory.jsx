import { useEffect, useMemo } from 'react';
import { ActivityLog, MetaLine } from '../../components/ActivityLog/ActivityLog';
import { historyTimelineStyles as htStyles } from '../../components/HistoryTimeline/HistoryTimeline';
import { groupByMonth } from '../../components/Timeline/Timeline.utils';
import { Avatar } from '../../components/Avatar/Avatar';
import { Link } from '../../components/Link/Link';
import { RingEmptyState } from '../../components/RingEmptyState/RingEmptyState';
import { useAppStore } from '../../store/useAppStore';
import { formatDate, formatDateTime, initialsOf } from './oooUtils';
import { TYPE_LABELS } from './reassignJobs';
import styles from './reassign.module.css';

/**
 * The Reassign Appointments drawer's History tab: every reassignment job,
 * whoever it was for, newest first, as an activity log grouped by month.
 * Each entry opens its Appointment Reassignment Summary.
 */
export function ReassignHistory() {
  const jobs = useAppStore(s => s.reassignmentJobs);
  const fetchJobs = useAppStore(s => s.fetchReassignmentJobs);
  const openSummary = useAppStore(s => s.openReassignmentSummary);
  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const entries = useMemo(() => groupByMonth(jobs).flatMap(month => [
    { t: 'group', label: month.label },
    ...month.entries.map((j) => {
      const range = j.windowEnd ? `${formatDate(j.windowStart)} – ${formatDate(j.windowEnd)}` : j.windowStart ? `From ${formatDate(j.windowStart)}` : '';
      const when = formatDateTime(j.createdAt);
      return {
        t: 'reassignment',
        id: j.id,
        avatar: <Avatar variant="staff" initials={initialsOf(j.fromUser)} size="S" />,
        render: () => (
          <>
            <MetaLine entry={{ date: when.split(', ')[0], time: when.split(', ')[1], by: j.createdBy }} />
            <div className={htStyles.headlineRow}>
              <span className={htStyles.headline}>{j.fromUser} • {TYPE_LABELS[j.type] || 'Reassignment'}{range ? ` • ${range}` : ''}</span>
            </div>
            <span className={styles.historySub}>
              {j.results.length} Appointments • {j.reassignedCount} Reassigned • {j.cancelledCount} Cancelled • {j.conflictingCount} Conflicting • {j.failedCount} Failed
            </span>
            <Link className={styles.historyLink} role="button" tabIndex={0} onClick={() => openSummary(j.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSummary(j.id); } }}>
              View Summary
            </Link>
          </>
        ),
      };
    }),
  ]), [jobs, openSummary]);

  if (!jobs.length) {
    return <RingEmptyState icon="solar:history-linear" label="No reassignments yet" />;
  }
  return <ActivityLog entries={entries} />;
}
