// Out of Office notifications: the link under each (Figma pattern of
// "N new appointments assigned to you." → View Appointments).
export const COVERING_LINKS = {
  'ooo.covering_started': 'View Covered Work',
  'message.covering': 'Open Conversation',
  'efax.covering': 'Open eFax',
  'call.missed_covering': 'Open Conversation',
  'ooo.reassigned': 'View Summary',
  'ooo.returned': 'View Summary',
};

export function mapNotificationRow(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body || '',
    action: row.action || null,
    taskId: row.task_id ?? null,
    hccMemberId: row.hcc_member_id ?? null,
    referralId: row.referral_id ?? null,
    reassignmentJobId: row.reassignment_job_id ?? null,
    conversationId: row.conversation_id ?? null,
    channel: row.conversation_channel ?? null,
    efaxId: row.efax_id ?? null,
    coveringFor: row.covering_for ?? null,
    oooRecordId: row.ooo_record_id ?? null,
    // "You're covering for …" with what was assigned opens the summary.
    linkLabel: (row.type === 'ooo.covering_started' && row.action === 'openReassignmentSummary') ? 'View Summary' : (COVERING_LINKS[row.type] || null),
    read: !!row.read,
    ts: row.created_at ? Date.parse(row.created_at) : Date.now(),
    actorName: row.actor_name || null,
    persisted: true,
  };
}

/** Newest-first merge; incoming rows win on id collision. */
export function mergeNotifications(incoming, existing) {
  const byId = new Map();
  for (const n of [...existing, ...incoming]) byId.set(n.id, n);
  return [...byId.values()].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 50);
}
