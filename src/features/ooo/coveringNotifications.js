// Notifications for the Out of Office flow, built from real data. Each one has
// a stable id (`cov:…`) so building them again never adds a duplicate, and
// reading one sticks across reloads.
//
// To the covering provider:
//   ooo.covering_started   You're covering for Navin Jethwani.          → View Covered Work
//   message.covering       New message from Amy Phillips.               → Open Conversation
//   efax.covering          New eFax in Billing.                         → Open eFax
//   call.missed_covering   Missed call from Amy Phillips.               → Open Conversation
//   ooo.reassigned         18 items assigned to you.                    → View Summary
// To the person who was out:
//   ooo.returned           Welcome back. Here's what happened while you were out. → View Summary
//
// (Whoever ran a reassignment already gets "summary is ready", and
// Reassign Appointments keeps its own "N new appointments assigned to you.")

import { COVERING_LINKS } from '../../store/lib/notificationStoreLib';

export { COVERING_LINKS };
export const COVERING_TYPES = ['ooo.covering_started', 'message.covering', 'efax.covering', 'call.missed_covering', 'ooo.reassigned', 'ooo.returned'];

/** A notification as the bell shows it: with its link label. */
export const withLink = (n) => ({ ...n, linkLabel: n.linkLabel || COVERING_LINKS[n.type] });

const BECAUSE = "You're receiving this because you're covering for them.";
const ts = (v) => (v ? new Date(v).getTime() : Date.now());
const mdY = (v) => new Date(v).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
/** "a", "a and b", "a, b and c". */
export const listJoin = (parts) => (parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0] || '');
const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || name;

/**
 * 1. Coverage started, to each covering provider. With the Out of Office
 * reassignment that moved their work to me (`job`, `mine`), it says what and
 * by whom, and opens my share of the summary.
 */
export function coverageStarted(record, { job = null, mine = [] } = {}) {
  const name = record.userName;
  const dates = `${mdY(record.startAt)} – ${mdY(record.endAt)}`;
  const base = {
    id: `cov:start:${record.id}`,
    type: 'ooo.covering_started',
    title: `You're covering for ${name}.`,
    coveringFor: name,
    ts: ts(record.startAt),
  };
  if (job && mine.length) {
    return {
      ...base,
      body: `${job.createdBy || 'Someone'} assigned you ${itemsPhrase(mine)} from ${firstName(name)}, out of office ${dates}.`,
      action: 'openReassignmentSummary',
      reassignmentJobId: job.id,
      linkLabel: 'View Summary',
      ts: Math.max(ts(record.startAt), ts(job.createdAt)),
    };
  }
  return {
    ...base,
    body: `${firstName(name)} is out of office ${dates}. Their messages, calls and new work come to you.`,
    action: 'openCoveredWork',
  };
}

// What a patient message is called in its notification, by channel.
export const MESSAGE_WORDS = { sms: 'SMS', chat: 'chat message', email: 'email' };

/**
 * 2. A patient message (SMS, chat, email) to someone I cover, like the eFax
 * one: the channel, who it's from, and the inbox it came into.
 */
export function coveredMessage({ conversation, coveredName, inboxName, at }) {
  const word = MESSAGE_WORDS[conversation.channel] || 'message';
  return {
    id: `cov:msg:${conversation.id}`,
    type: 'message.covering',
    title: `New ${word} from ${conversation.patient_name || 'a patient'}.`,
    body: inboxName ? `In ${inboxName}, assigned to ${coveredName}. ${BECAUSE}` : `Assigned to ${coveredName}. ${BECAUSE}`,
    action: 'openCommsConversation',
    conversationId: conversation.id,
    channel: conversation.channel,
    coveringFor: coveredName,
    ts: ts(at || conversation.last_message_at),
  };
}

/** 3. An eFax on a number whose linked user I cover. */
export function coveredEfax({ fax, inboxName, coveredName }) {
  return {
    id: `cov:efax:${fax.id}`,
    type: 'efax.covering',
    title: `New eFax in ${inboxName}.`,
    body: `Assigned to ${coveredName}. ${BECAUSE}`,
    action: 'openEfax',
    efaxId: fax.id,
    coveringFor: coveredName,
    ts: ts(fax.receivedAt),
  };
}

/** 4. A missed call to someone I cover. */
export function coveredMissedCall({ conversation, coveredName, at }) {
  return {
    id: `cov:call:${conversation.id}`,
    type: 'call.missed_covering',
    title: `Missed call from ${conversation.patient_name || 'a patient'}.`,
    body: `Called ${coveredName}. ${BECAUSE}`,
    action: 'openCommsConversation',
    conversationId: conversation.id,
    channel: conversation.channel,
    coveringFor: coveredName,
    ts: ts(at || conversation.last_message_at),
  };
}

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

/** 5. An Out of Office reassignment, all modules, to one covering provider. */
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

/** 9. Back from out of office: what happened to my work. */
export function welcomeBack({ record, job, completed = 0, autoReplies = 0 }) {
  const moved = (job?.results || []).filter(r => r.outcome === 'reassigned').length;
  const parts = [
    `${plural(moved, 'item', 'items')} reassigned`,
    `${completed} completed by your covering providers`,
    `${plural(autoReplies, 'auto-reply', 'auto-replies')} sent`,
  ];
  return {
    id: `cov:back:${record.id}`,
    type: 'ooo.returned',
    title: "Welcome back. Here's what happened while you were out.",
    body: `${parts.join(', ')}.`,
    action: 'openAwaySummary',
    reassignmentJobId: job?.id || null,
    oooRecordId: record.id,
    ts: ts(record.endAt),
  };
}
