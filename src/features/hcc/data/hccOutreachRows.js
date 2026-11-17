// hcc_outreach_logs row ↔ outreach log, shared by the store and the seed.

export function hccOutreachToRow(log) {
  return {
    id: String(log.id),
    member_id: log.memberId ?? null,
    member_name: log.memberName,
    log_date: log.logDate,
    log_time: log.logTime || '',
    type: log.type || 'Call',
    title: log.title || '',
    author: log.author || '',
    hccs: log.hccs || [],
    outcome: log.outcome ?? null,
    outcomes: log.outcomes || (log.outcome ? [log.outcome] : []),
    outcome_color: log.outcomeColor ?? null,
    note: log.note || '',
    call_details: log.callDetails ?? null,
    snooze_until: log.snoozeUntil ?? null,
  };
}

export function rowToHccOutreach(r) {
  return {
    id: r.id,
    memberId: r.member_id,
    memberName: r.member_name,
    logDate: r.log_date,
    logTime: r.log_time || '',
    type: r.type,
    title: r.title,
    author: r.author,
    hccs: r.hccs || [],
    outcome: r.outcome,
    outcomes: r.outcomes || [],
    outcomeColor: r.outcome_color,
    note: r.note || '',
    callDetails: r.call_details || undefined,
    snoozeUntil: r.snooze_until,
  };
}

/**
 * A member's logs as the outreach feed's month groups, newest first:
 * [{ id: '0-2026', label: 'Jan 2026', logs: [{ ...log, date: 'MM/DD', time, programs }] }].
 */
export function hccOutreachGroups(logs) {
  const sorted = [...logs].sort((a, b) => (b.logDate || '').localeCompare(a.logDate || ''));
  const groups = [];
  for (const log of sorted) {
    const [y, m, d] = String(log.logDate).split('-').map(Number);
    if (!y || !m || !d) continue;
    const key = `${m - 1}-${y}`;
    let group = groups.find(g => g.id === key);
    if (!group) {
      group = { id: key, label: new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), logs: [] };
      groups.push(group);
    }
    group.logs.push({
      ...log,
      date: `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}`,
      time: log.logTime,
      programs: log.hccs,
    });
  }
  return groups;
}

// The member's outreach logs: by member id when the row has one, else by name
// (seeded rows are keyed by name).
export function outreachForMember(logs, member) {
  if (!member) return [];
  return (logs || []).filter(l => (l.memberId && member.id ? String(l.memberId) === String(member.id) : l.memberName === member.name));
}
