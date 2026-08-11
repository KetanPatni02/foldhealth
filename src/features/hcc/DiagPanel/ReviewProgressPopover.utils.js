import { ROLE_LABEL, staffById } from '../assignment/astranaStaff';

const TERMINAL_STATUSES = new Set(['Completed', 'Billing Ready']);
const REJECTED_STATUSES = new Set(['Reject', 'Rejected', 'Insufficient']);

export function buildReviewStages(member, dosState) {
  const visibleRoles = ['support', 'coder', 'reviewer', 'reviewer2'];
  return visibleRoles.map((role) => {
    const rs = dosState?.[role];
    const legacyMap = {
      support:   { name: member?.sup, status: member?.supS },
      coder:     { name: member?.cdr, status: member?.cdrS },
      reviewer:  { name: member?.r1,  status: member?.r1s },
      reviewer2: { name: member?.r2,  status: member?.r2s },
    };
    const assigneeId = rs?.assignee || null;
    const staff = assigneeId ? staffById(assigneeId) : null;
    const name = staff?.name || legacyMap[role].name || null;
    const status = rs?.status || legacyMap[role].status || null;

    let state = 'pending';
    if (status === 'Skipped') state = 'skipped';
    else if (status && REJECTED_STATUSES.has(status)) state = 'rejected';
    else if (status && TERMINAL_STATUSES.has(status)) state = 'done';
    else if (status && status !== 'Assign') state = 'active';

    const at = rs?.history?.[rs.history.length - 1]?.at;
    const date = at ? new Date(at).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : null;

    return { role, label: ROLE_LABEL[role], name, status, date, state };
  });
}

export function computeReviewProgress(stages) {
  if (!stages?.length) return 0;
  const N = stages.length;
  const done = stages.filter(s => s.state === 'done' || s.state === 'skipped').length;
  const active = stages.filter(s => s.state === 'active').length;
  return Math.min(1, (done + active * 0.5) / N);
}
