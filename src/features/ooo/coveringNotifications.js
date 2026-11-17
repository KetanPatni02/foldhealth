// Out of Office notifications built in the app. The covering provider's
// notices (coverage started, patient messages, missed calls, eFaxes, items
// reassigned to them) come from the database triggers in
// ooo_covering_notifications_migration.sql. Built here, each with a stable
// id (`cov:…`) so building it again never adds a duplicate:
//   ooo.reassigned  18 items assigned to you.  → View Summary
//                   (only when the reassignment job couldn't be saved)
//   ooo.returned    Welcome back. Here's what happened while you were out. → View Summary
//                   (its counts are only known on the day they return)

import { COVERING_LINKS } from '../../store/lib/notificationStoreLib';

export { COVERING_LINKS };

/** A notification as the bell shows it: with its link label. */
export const withLink = (n) => ({ ...n, linkLabel: n.linkLabel || COVERING_LINKS[n.type] });

const ts = (v) => (v ? new Date(v).getTime() : Date.now());
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
/** "a", "a and b", "a, b and c". */
export const listJoin = (parts) => (parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0] || '');

const kindOf = (r) => r.kind || (r.task ? 'task' : r.program ? 'program' : 'appointment');
/** "8 appointments, 6 tasks and 4 care programs". */
export function itemsPhrase(results) {
  const n = (k) => results.filter(r => kindOf(r) === k).length;
  return listJoin([
    n('appointment') && plural(n('appointment'), 'appointment', 'appointments'),
    n('task') && plural(n('task'), 'task', 'tasks'),
    n('program') && plural(n('program'), 'care program', 'care programs'),
  ].filter(Boolean));
}

/** An Out of Office reassignment, all modules, to one covering provider. */
export function reassignedToMe({ job, mine }) {
  return {
    id: `cov:job:${job.id}`,
    type: 'ooo.reassigned',
    title: `${plural(mine.length, 'item', 'items')} assigned to you.`,
    body: `${job.createdBy || 'Someone'} reassigned ${itemsPhrase(mine)} from ${job.fromUser} to you.`,
    action: 'openReassignmentSummary',
    reassignmentJobId: job.id,
    coveringFor: job.fromUser,
    ts: ts(job.finishedAt || job.createdAt),
  };
}

/** Back from out of office: what happened to my work. */
export function welcomeBack({ record, job }) {
  return {
    id: `cov:back:${record.id}`,
    type: 'ooo.returned',
    title: "Welcome back. Here's what happened while you were out.",
    // No counts line: the summary has them, by module.
    body: '',
    action: 'openAwaySummary',
    reassignmentJobId: job?.id || null,
    oooRecordId: record.id,
    ts: ts(record.endAt),
  };
}
