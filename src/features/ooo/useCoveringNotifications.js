import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { listConversations, listStaffSends } from '../messages/comms/commsRepo';
import { lastStaffSenders } from '../messages/comms/commsFilters';
import { isMissedCall } from '../messages/comms/commsUtils';
import { awayItems, loadAwayMessages, loadProgramsNow } from './awaySummary';
import { coveringPeople, oooStatus, recordPerson, samePerson, sameName } from './oooUtils';
import {
  COVERING_TYPES, coverageStarted, coveredEfax, coveredMessage, coveredMissedCall, reassignedToMe, welcomeBack, withLink,
} from './coveringNotifications';

const DAY = 86400000;
// "Welcome back" shows for a week after the return date.
const BACK_FOR_MS = 7 * DAY;
const DEMO_PATIENT = 'Amy Phillips';

/**
 * Builds the Out of Office notifications for the signed-in user from real
 * data and adds them to the bell (once each; ids are stable). Stands in for
 * ooo_covering_notifications_migration.sql until Alok runs it: as soon as the
 * database sends any of these itself, this stops.
 *
 * Demo: when nothing real matches yet (no patient has written to the person
 * I cover since they left), the message, missed call and eFax use the latest
 * real conversation or fax, so every notification and link can be tried.
 */
export function useCoveringNotifications() {
  const me = useAppStore(s => s.currentUserProfile);
  const records = useAppStore(s => s.oooRecords);
  const jobs = useAppStore(s => s.reassignmentJobs);
  const faxes = useAppStore(s => s.efaxes);
  const numbers = useAppStore(s => s.efaxNumbers);
  const inboxes = useAppStore(s => s.commsInboxes);
  const tasks = useAppStore(s => s.tasks);
  const appointments = useAppStore(s => s.appointments);
  const notifications = useAppStore(s => s.notifications);
  const addNotification = useAppStore(s => s.addNotification);
  const [comms, setComms] = useState(null); // { conversations, staffOf }
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (!me?.name) return;
    const st = useAppStore.getState();
    st.fetchOooRecords?.();
    st.fetchReassignmentJobs?.();
    st.fetchEfaxes?.();
    st.fetchEfaxNumbers?.();
    st.fetchCommsInboxes?.();
    let live = true;
    listConversations()
      .then(async (conversations) => {
        const rows = await listStaffSends(conversations.map(c => c.id)).catch(() => []);
        if (live) setComms({ conversations, staffOf: lastStaffSenders(rows) });
      })
      .catch(() => live && setComms({ conversations: [], staffOf: new Map() }));
    return () => { live = false; };
  }, [me?.name]);

  // Back from my own Out of Office (within the last week), with what
  // happened to my work: the latest reassignment from me. Demo: with no
  // return in the last week, the latest reassignment from me stands for it.
  const back = useMemo(() => {
    if (!me?.name) return null;
    const self = { id: me.id || null, name: me.name };
    const allModules = (j) => (j.results || []).some(r => (r.kind || 'appointment') !== 'appointment');
    const returned = (records || []).filter(r => samePerson(recordPerson(r), self) && oooStatus(r) === 'Past' && now - new Date(r.endAt) < BACK_FOR_MS)
      .sort((a, b) => new Date(b.endAt) - new Date(a.endAt))[0];
    const fromMe = (jobs || []).filter(j => allModules(j) && sameName(j.fromUser, self.name))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const job = (returned && fromMe.find(j => j.oooRecordId === returned.id)) || fromMe[0];
    const record = returned || (job && (records || []).find(r => r.id === job.oooRecordId))
      || (job && { id: job.oooRecordId || job.id, startAt: job.windowStart, endAt: job.windowEnd || job.createdAt });
    return record && job ? { record, job } : null;
  }, [me, records, jobs, now]);
  // Counted as While You Were Away counts them (completed now, auto-replies
  // sent in those dates).
  const [backExtra, setBackExtra] = useState(null); // { jobId, programsById, autoReplies }
  useEffect(() => {
    if (!back) return undefined;
    let live = true;
    const ids = back.job.results.filter(r => r.programId).map(r => r.programId);
    Promise.all([
      loadProgramsNow(ids).catch(() => new Map()),
      loadAwayMessages({ me, from: back.record.startAt, to: back.record.endAt }).catch(() => ({ autoReplies: 0 })),
    ]).then(([programsById, msgs]) => live && setBackExtra({ jobId: back.job.id, programsById, autoReplies: msgs.autoReplies }));
    return () => { live = false; };
  }, [back, me]);

  useEffect(() => {
    if (!me?.name || !comms) return;
    // The database sends these once the migration runs; don't double up.
    // ("Welcome back" is always built here: its counts come on the day.)
    const fromDb = (notifications || []).some(n => n.persisted && COVERING_TYPES.includes(n.type) && n.type !== 'ooo.returned');
    const self = { id: me.id || null, name: me.name };
    const have = new Set((notifications || []).map(n => n.id));
    const out = [];
    const add = (n) => { if (n && !have.has(n.id)) { have.add(n.id); out.push(withLink(n)); } };

    // Whom I'm covering right now.
    const covering = (records || []).filter(r => oooStatus(r) === 'Ongoing' && coveringPeople(r.coverage).some(c => samePerson(c, self)));
    // Out of Office reassignments that moved work to me (all modules). A job
    // with appointments only came from Reassign Appointments, which keeps its
    // own "N new appointments assigned to you."
    const isMine = (r) => r.outcome === 'reassigned'
      && ((r.toId && self.id && String(r.toId) === String(self.id)) || (!r.toId && sameName(r.to, self.name)));
    const allModules = (j) => (j.results || []).some(r => (r.kind || 'appointment') !== 'appointment');
    const toMe = (jobs || []).filter(j => allModules(j) && !sameName(j.fromUser, self.name))
      .map(job => ({ job, mine: (job.results || []).filter(isMine) }))
      .filter(x => x.mine.length);
    // One notice per person I cover: what was assigned to me and by whom.
    const told = new Set();
    if (!fromDb) covering.forEach((r) => {
      const hit = toMe.find(x => x.job.oooRecordId === r.id) || toMe.find(x => sameName(x.job.fromUser, recordPerson(r).name));
      if (hit) told.add(hit.job.id);
      add(coverageStarted(r, hit || {}));
    });

    if (!fromDb && covering.length) {
      const sentTo = (c) => covering.find(r => sameName(comms.staffOf.get(c.id), recordPerson(r).name)
        && new Date(c.last_message_at) >= new Date(r.startAt));
      const live = comms.conversations.filter(c => !c.archived);
      const demo = live.find(c => sameName(c.patient_name, DEMO_PATIENT)) || live[0];
      const first = recordPerson(covering[0]).name;

      // A patient message on each channel (SMS, chat, email): a real one to
      // someone I cover, else that channel's latest thread (Amy Phillips' first).
      const inboxName = (c) => (inboxes || []).find(i => i.id === c.inbox_id)?.name;
      ['sms', 'chat', 'email'].forEach((ch) => {
        const onCh = live.filter(c => c.channel === ch);
        const real = onCh.find(sentTo);
        const conv = real || onCh.find(c => sameName(c.patient_name, DEMO_PATIENT)) || onCh[0];
        if (conv) add(coveredMessage({ conversation: conv, coveredName: real ? recordPerson(sentTo(real)).name : first, inboxName: inboxName(conv) }));
      });

      // A missed call: a real one, else the latest call thread (or the demo thread).
      const call = live.find(c => isMissedCall(c) && sentTo(c));
      const anyCall = live.find(c => c.channel === 'call') || demo;
      if (call) add(coveredMissedCall({ conversation: call, coveredName: recordPerson(sentTo(call)).name }));
      else if (anyCall) add(coveredMissedCall({ conversation: anyCall, coveredName: first }));

      // An eFax on a number whose linked user I cover, else the latest fax.
      const active = (numbers || []).filter(n => n.isActive);
      const numberOf = (f) => (numbers || []).find(n => n.id === f.efaxNumberId) || active[0];
      const coveredOn = (f) => covering.find(r => (numberOf(f)?.linkedUserIds || []).includes(recordPerson(r).id)
        && new Date(f.receivedAt) >= new Date(r.startAt));
      const fax = (faxes || []).find(coveredOn);
      const latest = (faxes || [])[0];
      if (fax) add(coveredEfax({ fax, inboxName: numberOf(fax)?.name || 'eFax', coveredName: recordPerson(coveredOn(fax)).name }));
      else if (latest) add(coveredEfax({ fax: latest, inboxName: numberOf(latest)?.name || 'eFax', coveredName: first }));
    }

    // Reassignments from someone I'm not covering now (or covered before).
    if (!fromDb) toMe.filter(x => !told.has(x.job.id)).forEach(x => add(reassignedToMe(x)));

    if (back && backExtra?.jobId === back.job.id) {
      const { counts } = awayItems(back.job, {
        tasksById: new Map((tasks || []).map(t => [String(t.id), t])),
        apptsById: new Map((appointments || []).map(x => [String(x.id), x])),
        programsById: backExtra.programsById,
      });
      add(welcomeBack({ record: back.record, job: back.job, completed: counts.completed, autoReplies: backExtra.autoReplies }));
    }

    out.forEach(n => addNotification(n));
  }, [me, records, jobs, faxes, numbers, inboxes, tasks, appointments, comms, back, backExtra, notifications, addNotification]);
}
