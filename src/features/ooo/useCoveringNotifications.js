import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { oooStatus, recordPerson, samePerson, sameName } from './oooUtils';
import { welcomeBack, withLink } from './coveringNotifications';

const DAY = 86400000;
// "Welcome back" shows for a week after the return date.
const BACK_FOR_MS = 7 * DAY;

/**
 * "Welcome back" for the signed-in user (opens While You Were Away). The covering provider's notices come
 * from the database (ooo_covering_notifications_migration.sql).
 *
 * Runs on every page, so it reads nothing until the user has an Out of
 * Office record that ended in the last week (records are already loaded by
 * AppLayout); then only that record's reassignment job.
 */
export function useCoveringNotifications() {
  const me = useAppStore(s => s.currentUserProfile);
  const records = useAppStore(s => s.oooRecords);
  const jobs = useAppStore(s => s.reassignmentJobs);
  const jobsFetched = useAppStore(s => s.reassignmentJobsFetched);
  const notifications = useAppStore(s => s.notifications);
  const addNotification = useAppStore(s => s.addNotification);
  const [now] = useState(() => Date.now());

  // My Out of Office that ended in the last week, if any.
  const returned = useMemo(() => {
    if (!me?.name) return null;
    const self = { id: me.id || null, name: me.name };
    return (records || [])
      .filter(r => samePerson(recordPerson(r), self) && oooStatus(r) === 'Past' && now - new Date(r.endAt) < BACK_FOR_MS)
      .sort((a, b) => new Date(b.endAt) - new Date(a.endAt))[0] || null;
  }, [me, records, now]);

  useEffect(() => {
    if (returned && !jobsFetched) useAppStore.getState().fetchReassignmentJobs?.();
  }, [returned, jobsFetched]);

  // The reassignment that moved my work for that record.
  const job = useMemo(() => {
    if (!returned || !me?.name) return null;
    return (jobs || [])
      .filter(j => j.oooRecordId === returned.id && sameName(j.fromUser, me.name))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
  }, [returned, jobs, me]);

  // One "Welcome back" per return; its counts live in the summary.
  const already = (notifications || []).some(n => n.id === `cov:back:${returned?.id}`);
  useEffect(() => {
    if (!returned || !job || already) return;
    addNotification(withLink(welcomeBack({ record: returned, job })));
  }, [returned, job, already, addNotification]);
}
