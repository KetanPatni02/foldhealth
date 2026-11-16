import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { awayItems, loadAwayMessages, loadProgramsNow } from './awaySummary';
import { oooStatus, recordPerson, samePerson, sameName } from './oooUtils';
import { welcomeBack, withLink } from './coveringNotifications';

const DAY = 86400000;
// "Welcome back" shows for a week after the return date.
const BACK_FOR_MS = 7 * DAY;

/**
 * "Welcome back" for the signed-in user, built here because its counts are
 * only known on the day they return. The covering provider's notices come
 * from the database (ooo_covering_notifications_migration.sql).
 *
 * Runs on every page, so it reads nothing until the user has an Out of
 * Office record that ended in the last week (records are already loaded by
 * AppLayout); then only that record's reassignment job, its care programs
 * and their auto-replies.
 */
export function useCoveringNotifications() {
  const me = useAppStore(s => s.currentUserProfile);
  const records = useAppStore(s => s.oooRecords);
  const jobs = useAppStore(s => s.reassignmentJobs);
  const jobsFetched = useAppStore(s => s.reassignmentJobsFetched);
  const tasks = useAppStore(s => s.tasks);
  const appointments = useAppStore(s => s.appointments);
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

  // Counted as While You Were Away counts them (completed now, auto-replies
  // sent in those dates).
  const [extra, setExtra] = useState(null); // { jobId, programsById, autoReplies }
  const already = (notifications || []).some(n => n.id === `cov:back:${returned?.id}`);
  useEffect(() => {
    if (!returned || !job || already) return undefined;
    let live = true;
    const ids = (job.results || []).filter(r => r.programId).map(r => r.programId);
    Promise.all([
      loadProgramsNow(ids).catch(() => new Map()),
      loadAwayMessages({ me, from: returned.startAt, to: returned.endAt }).catch(() => ({ autoReplies: 0 })),
    ]).then(([programsById, msgs]) => live && setExtra({ jobId: job.id, programsById, autoReplies: msgs.autoReplies }));
    return () => { live = false; };
  }, [returned, job, me, already]);

  useEffect(() => {
    if (!returned || !job || already || extra?.jobId !== job.id) return;
    const { counts } = awayItems(job, {
      tasksById: new Map((tasks || []).map(t => [String(t.id), t])),
      apptsById: new Map((appointments || []).map(x => [String(x.id), x])),
      programsById: extra.programsById,
    });
    addNotification(withLink(welcomeBack({ record: returned, job, completed: counts.completed, autoReplies: extra.autoReplies })));
  }, [returned, job, extra, already, tasks, appointments, addNotification]);
}
