// "While You Were Away": what the covering providers did with someone's work
// during their Out of Office, read from the live records (not the snapshot
// the reassignment took). Used by the summary drawer and the "Welcome back"
// notification so both count the same way.

import { supabase } from '../../lib/supabase';
import { auditLogDbToJs } from '../../lib/embedMapper';
import { displayAppointmentStatus } from '../../components/ScheduleDrawer/scheduleDrawerConstants';
import { listConversations, listStaffSends } from '../messages/comms/commsRepo';

const kindOf = (r) => r.kind || (r.task ? 'task' : r.program ? 'program' : 'appointment');

/** Where an item stands now: completed | cancelled | open. */
export function outcomeNow(result, { tasksById, apptsById, programsById }) {
  const kind = kindOf(result);
  if (kind === 'task') {
    const t = tasksById.get(String(result.taskId));
    return t?.status === 'completed' ? 'completed' : 'open';
  }
  if (kind === 'program') {
    const p = programsById.get(String(result.programId));
    return /complet|graduat|discharg|disenroll/i.test(p?.status || '') ? 'completed' : 'open';
  }
  const a = apptsById.get(String(result.appointmentId));
  const s = a?.status || '';
  if (/checked out|complet/i.test(s)) return 'completed';
  if (/cancel|no.?show/i.test(s)) return 'cancelled';
  return 'open';
}

/** Who has an item now (it may have moved again since it was reassigned). */
export function holderNow(result, { tasksById, apptsById, programsById }) {
  const kind = kindOf(result);
  if (kind === 'task') return tasksById.get(String(result.taskId))?.assigned_to || result.to;
  if (kind === 'program') return programsById.get(String(result.programId))?.assignee || result.to;
  return apptsById.get(String(result.appointmentId))?.primary_user || result.to;
}

/** The key a result's changes are filed under. */
export const itemKey = (r) => (kindOf(r) === 'task' ? `task:${r.taskId}` : kindOf(r) === 'program' ? `program:${r.programId}` : `appointment:${r.appointmentId}`);

/**
 * Each reassigned item with its outcome now, plus totals.
 * Returns { items: [{ ...result, kind, now }], counts: { reassigned, completed, open, cancelled } }.
 */
export function awayItems(job, lookups) {
  const items = (job?.results || [])
    .filter(r => r.outcome === 'reassigned')
    .map(r => ({ ...r, kind: kindOf(r), now: outcomeNow(r, lookups), holder: holderNow(r, lookups) }));
  const count = (k) => items.filter(i => i.now === k).length;
  return { items, counts: { reassigned: items.length, completed: count('completed'), open: count('open'), cancelled: count('cancelled') } };
}

/** Care program enrollments' current status, by id. */
export async function loadProgramsNow(ids) {
  if (!ids.length) return new Map();
  const { data } = await supabase.from('patient_care_programs').select('id, status, assignee, patient_id, code, name').in('id', ids);
  return new Map((data || []).map(p => [String(p.id), p]));
}

const TASK_STATUS = { pending: 'Pending', missed: 'Missed', completed: 'Completed' };
// Care plan changes the Program History lists as they happened.
const PLAN_ACTIONS = ['status_changed', 'priority_changed', 'progress_changed', 'assignee_changed', 'updated', 'note', 'review_requested'];
const inWindow = (q, from, to) => {
  let r = q;
  if (from) r = r.gte('created_at', new Date(from).toISOString());
  if (to) r = r.lte('created_at', new Date(to).toISOString());
  return r;
};

/**
 * Status and assignee changes to the reassigned items during the absence
 * (not the Out of Office reassignment itself), from the task and appointment
 * audit logs (care programs: the Program Activity Log, as `activity` entries
 * with a title). Returns Map itemKey → [{ type: 'status' | 'assignee' | 'activity', from, to, title, by, at }], oldest first.
 */
export async function loadAwayChanges({ job, from, to }) {
  const byItem = new Map();
  const push = (key, c) => { if (!byItem.has(key)) byItem.set(key, []); byItem.get(key).push(c); };
  const results = (job?.results || []).filter(r => r.outcome === 'reassigned');
  const taskIds = results.filter(r => kindOf(r) === 'task').map(r => r.taskId);
  const apptIds = results.filter(r => kindOf(r) === 'appointment').map(r => String(r.appointmentId));
  // Care programs: the patient's Program Activity Log, by program.
  const programIds = results.filter(r => kindOf(r) === 'program').map(r => r.programId);
  const programs = programIds.length ? await loadProgramsNow(programIds).catch(() => new Map()) : new Map();
  const patientIds = [...new Set([...programs.values()].map(p => p.patient_id).filter(Boolean))];
  const [tasks, appts, programLog, planAudit] = await Promise.all([
    taskIds.length
      ? inWindow(supabase.from('task_audit_log').select('task_id, action_type, from_value, to_value, user_name, created_at')
        .in('task_id', taskIds).in('action_type', ['status_changed', 'assignee_changed', 'ooo_returned']), from, to)
      : Promise.resolve({ data: [] }),
    apptIds.length
      ? inWindow(supabase.from('audit_logs').select('*').eq('entity_type', 'Appointment').in('entity_id', apptIds), from, to)
      : Promise.resolve({ data: [] }),
    (() => {
      if (!patientIds.length) return Promise.resolve({ data: [] });
      let q = supabase.from('patient_program_activity').select('patient_id, program_code, title, actor_name, occurred_at').in('patient_id', patientIds);
      if (from) q = q.gte('occurred_at', new Date(from).toISOString());
      if (to) q = q.lte('occurred_at', new Date(to).toISOString());
      return q;
    })(),
    // …and its care plan's changes (goal and intervention status, notes,
    // reviews), as its Program History shows them.
    patientIds.length
      ? inWindow(supabase.from('care_plan_audit').select('patient_id, program_id, program_code, action, summary, actor, created_at')
        .in('patient_id', patientIds).in('action', PLAN_ACTIONS), from, to)
      : Promise.resolve({ data: [] }),
  ]);
  (planAudit.data || []).forEach((a) => {
    programs.forEach((p, id) => {
      const same = String(a.program_id) === String(id)
        || (String(p.patient_id) === String(a.patient_id) && p.code && p.code === a.program_code);
      if (same) push(`program:${id}`, { type: 'activity', title: a.summary || a.action, by: a.actor, at: a.created_at });
    });
  });
  (programLog.data || []).forEach((l) => {
    programs.forEach((p, id) => {
      if (String(p.patient_id) === String(l.patient_id) && p.code === l.program_code) {
        push(`program:${id}`, { type: 'activity', title: l.title, by: l.actor_name, at: l.occurred_at });
      }
    });
  });
  (tasks.data || []).forEach((l) => {
    const status = l.action_type === 'status_changed';
    push(`task:${l.task_id}`, {
      type: status ? 'status' : 'assignee',
      from: status ? (TASK_STATUS[l.from_value] || l.from_value) : l.from_value,
      to: status ? (TASK_STATUS[l.to_value] || l.to_value) : l.to_value,
      by: l.user_name, at: l.created_at,
    });
  });
  (appts.data || []).map(auditLogDbToJs).forEach((l) => {
    (l.changes || []).forEach((c) => {
      if (String(c.from ?? '') === String(c.to ?? '')) return;
      if (c.field === 'status') {
        push(`appointment:${l.entityId}`, { type: 'status', from: displayAppointmentStatus(c.from), to: displayAppointmentStatus(c.to), by: l.userName || l.user, at: l.createdAt });
      } else if (c.field === 'primary_user' && !/out of office/i.test(l.details || '')) {
        push(`appointment:${l.entityId}`, { type: 'assignee', from: c.from, to: c.to, by: l.userName || l.user, at: l.createdAt });
      }
    });
  });
  byItem.forEach(list => list.sort((a, b) => new Date(a.at) - new Date(b.at)));
  return byItem;
}

/** Totals of loadAwayChanges: { status, assignee }. */
export function changeCounts(byItem) {
  let status = 0; let assignee = 0;
  byItem.forEach(list => list.forEach((c) => { if (c.type === 'status') status += 1; else if (c.type === 'assignee') assignee += 1; }));
  return { status, assignee };
}

/**
 * Comms and calls to catch up on: my threads (an inbox I'm on, the last
 * staff member to write before I left, or where my auto-reply went out) with
 * patient activity while I was away.
 * Returns {
 *   autoReplies,
 *   threads: [{ conversationId, channel, patientName, inbound, lastAt, preview, repliedBy: [], needsReply }],
 *   calls:   [{ id, conversationId, channel, patientName, at, outcome, answeredBy, calledBackBy: [] }],
 * } with what needs me first.
 */
export async function loadCatchUp({ me, from, to, inboxes = [] }) {
  const empty = { autoReplies: 0, threads: [], calls: [] };
  if (!me?.name) return empty;
  const conversations = (await listConversations().catch(() => [])).filter(c => !c.archived);
  if (!conversations.length) return empty;
  const mineInboxes = new Set((inboxes || []).filter(i => (i.collaboratorIds || i.collaborator_ids || []).map(String).includes(String(me.id))).map(i => i.id));
  const sends = await listStaffSends(conversations.map(c => c.id)).catch(() => []);
  const start = from ? new Date(from).getTime() : 0;
  const end = to ? new Date(to).getTime() : Infinity;
  const lastBefore = new Map();
  const autoIn = new Set();
  let autoReplies = 0;
  sends.forEach((m) => {
    const t = new Date(m.created_at).getTime();
    if (m.auto_reply === 'true') {
      if (m.sender_name === me.name && t >= start && t <= end) { autoIn.add(m.conversation_id); autoReplies += 1; }
      return;
    }
    if (t < start && !lastBefore.has(m.conversation_id)) lastBefore.set(m.conversation_id, m.sender_name);
  });
  const mine = conversations.filter(c => mineInboxes.has(c.inbox_id) || lastBefore.get(c.id) === me.name || autoIn.has(c.id));
  if (!mine.length) return { ...empty, autoReplies };
  const byId = new Map(mine.map(c => [c.id, c]));
  const { data } = await inWindow(supabase.from('patient_messages')
    .select('id, conversation_id, kind, direction, internal, sender_name, body, created_at, outcome:meta->>outcome, answered_by:meta->>answered_by, auto_reply:meta->>ooo_auto_reply')
    .in('conversation_id', mine.map(c => c.id)), from, to).order('created_at', { ascending: true });
  const msgs = (data || []).filter(m => !m.internal);
  const threads = []; const calls = [];
  mine.forEach((c) => {
    const own = msgs.filter(m => m.conversation_id === c.id);
    const inbound = own.filter(m => m.direction === 'in' && m.kind !== 'call');
    const replies = own.filter(m => m.direction === 'out' && m.kind !== 'call' && m.auto_reply !== 'true');
    if (inbound.length) {
      const last = inbound[inbound.length - 1];
      const lastReply = replies[replies.length - 1];
      threads.push({
        conversationId: c.id, channel: c.channel, patientName: c.patient_name || 'Patient',
        inbound: inbound.length, lastAt: last.created_at, preview: last.body || '',
        repliedBy: [...new Set(replies.map(m => m.sender_name).filter(Boolean))],
        needsReply: !lastReply || new Date(lastReply.created_at) < new Date(last.created_at),
      });
    }
    own.filter(m => m.kind === 'call' && m.direction === 'in').forEach((m) => {
      const back = own.filter(x => x.kind === 'call' && x.direction === 'out' && new Date(x.created_at) > new Date(m.created_at));
      calls.push({
        id: m.id, conversationId: c.id, channel: byId.get(c.id).channel, patientName: c.patient_name || 'Patient',
        at: m.created_at, outcome: m.outcome || 'missed', answeredBy: m.answered_by || null,
        calledBackBy: [...new Set(back.map(x => x.sender_name).filter(Boolean))],
      });
    });
  });
  threads.sort((a, b) => (b.needsReply - a.needsReply) || (new Date(b.lastAt) - new Date(a.lastAt)));
  const callNeeds = (x) => x.outcome !== 'completed' && !x.calledBackBy.length;
  calls.sort((a, b) => (callNeeds(b) - callNeeds(a)) || (new Date(b.at) - new Date(a.at)));
  return { autoReplies, threads, calls };
}

/** How many threads and calls still need me. */
export function catchUpCounts({ threads = [], calls = [] }) {
  return {
    threads: threads.filter(t => t.needsReply).length,
    calls: calls.filter(x => x.outcome !== 'completed' && !x.calledBackBy.length).length,
  };
}
