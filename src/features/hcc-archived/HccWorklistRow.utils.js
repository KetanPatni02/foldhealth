import { staffById } from './assignment/astranaStaff';

const TERMINAL_STATUSES = new Set(['Completed', 'Reject', 'Rejected', 'Billing Ready']);
const STAGES_LOW_TO_HIGH = ['support', 'coder', 'r1', 'r2', 'r3'];

function makeActive(staffId, role, status) {
  const staff = staffById(staffId);
  return {
    kind: 'active',
    name: staff?.name || staffId || null,
    initials: staff?.initials || (staffId || '').slice(0, 2),
    role,
    status,
  };
}

function makeActiveLegacy(name, role, status) {
  return {
    kind: 'active',
    name: name || null,
    initials: nameToInitials(name || ''),
    role,
    status,
  };
}

function nameToInitials(name) {
  if (!name) return '';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function resolveCurrentAssignee(member, dosState) {
  if (dosState) {
    for (const role of STAGES_LOW_TO_HIGH) {
      const rs = dosState[role];
      const status = rs?.status;
      const hasReachedStage = !!(status || rs?.assignee);
      if (!hasReachedStage || !status || status === 'Assign') {
        if (rs?.assignee && status && status !== 'Assign') {
          return makeActive(rs.assignee, role, status);
        }
        return { kind: 'unassigned', role };
      }
      if (!TERMINAL_STATUSES.has(status)) {
        return makeActive(rs?.assignee, role, status);
      }
    }
    return { kind: 'billing' };
  }

  const legacy = [
    { role: 'support', name: member.sup, status: member.supS },
    { role: 'coder',   name: member.cdr, status: member.cdrS },
    { role: 'r1',      name: member.r1,  status: member.r1s },
    { role: 'r2',      name: member.r2,  status: member.r2s },
    { role: 'r3',      name: member.r3,  status: member.r3s },
  ];
  for (const r of legacy) {
    if (!r.name && (!r.status || r.status === 'Assign')) {
      return { kind: 'unassigned', role: r.role };
    }
    if (!r.status || r.status === 'Assign') {
      return makeActiveLegacy(r.name, r.role, r.status);
    }
    if (!TERMINAL_STATUSES.has(r.status)) {
      return makeActiveLegacy(r.name, r.role, r.status);
    }
  }
  return { kind: 'billing' };
}
