// "While You Were Away": what the covering providers did with someone's work
// during their Out of Office, read from the live records (not the snapshot
// the reassignment took). Used by the summary drawer and the "Welcome back"
// notification so both count the same way.

import { supabase } from '../../lib/supabase';

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

/**
 * Each reassigned item with its outcome now, plus totals.
 * Returns { items: [{ ...result, kind, now }], counts: { reassigned, completed, open, cancelled } }.
 */
export function awayItems(job, lookups) {
  const items = (job?.results || [])
    .filter(r => r.outcome === 'reassigned')
    .map(r => ({ ...r, kind: kindOf(r), now: outcomeNow(r, lookups) }));
  const count = (k) => items.filter(i => i.now === k).length;
  return { items, counts: { reassigned: items.length, completed: count('completed'), open: count('open'), cancelled: count('cancelled') } };
}

/**
 * Patients written to while I was out: threads where my auto-reply went out,
 * and who on the care team replied (not me, not the auto-reply).
 * Returns { autoReplies, threads: [{ conversationId, channel, patientName, by, replies, lastAt }] }.
 */
export async function loadAwayMessages({ me, from, to }) {
  const empty = { autoReplies: 0, threads: [] };
  if (!me?.name) return empty;
  let q = supabase.from('patient_messages').select('conversation_id, created_at')
    .eq('sender_name', me.name).eq('meta->>ooo_auto_reply', 'true');
  if (from) q = q.gte('created_at', new Date(from).toISOString());
  if (to) q = q.lte('created_at', new Date(to).toISOString());
  const { data: autos, error } = await q;
  if (error) return empty;
  const ids = [...new Set((autos || []).map(m => m.conversation_id))];
  if (!ids.length) return { autoReplies: (autos || []).length, threads: [] };
  const [{ data: convs }, { data: sent }] = await Promise.all([
    supabase.from('patient_conversations').select('id, channel, patient_name').in('id', ids),
    (() => {
      let r = supabase.from('patient_messages').select('conversation_id, sender_name, created_at, auto_reply:meta->>ooo_auto_reply')
        .in('conversation_id', ids).eq('direction', 'out').eq('internal', false);
      if (from) r = r.gte('created_at', new Date(from).toISOString());
      return r.order('created_at', { ascending: false });
    })(),
  ]);
  const byConv = new Map((convs || []).map(c => [c.id, c]));
  const threads = ids.map((id) => {
    const replies = (sent || []).filter(m => m.conversation_id === id && m.auto_reply !== 'true' && m.sender_name && m.sender_name !== me.name);
    const c = byConv.get(id) || {};
    return {
      conversationId: id,
      channel: c.channel || 'sms',
      patientName: c.patient_name || 'Patient',
      by: [...new Set(replies.map(m => m.sender_name))],
      replies: replies.length,
      lastAt: replies[0]?.created_at || null,
    };
  });
  return { autoReplies: (autos || []).length, threads };
}

/** Care program enrollments' current status, by id. */
export async function loadProgramsNow(ids) {
  if (!ids.length) return new Map();
  const { data } = await supabase.from('patient_care_programs').select('id, status, assignee').in('id', ids);
  return new Map((data || []).map(p => [String(p.id), p]));
}
