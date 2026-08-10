export function getInitials(name) {
  if (!name) return '?';
  return name
    .replace(/^Dr\.\s*/i, '')
    .split(' ')
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();
}

export function computeGoalStatus(goalsDetail) {
  if (!Array.isArray(goalsDetail) || goalsDetail.length === 0) return null;
  const passed = goalsDetail.filter(g => g.pass).length;
  return { passed, total: goalsDetail.length, allMet: passed === goalsDetail.length };
}

export function computeOOH(startedAt) {
  if (!startedAt) return '-';
  const d = new Date(startedAt);
  if (isNaN(d.getTime())) return '-';
  const h = d.getHours();
  return (h < 9 || h >= 17) ? 'Yes' : 'No';
}

export function formatCallDate(str) {
  if (!str) return '-';
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export const TH_STYLE = {
  padding: '8px 14px',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--neutral-300)',
  borderBottom: '1px solid var(--neutral-150)',
  background: 'var(--neutral-0)',
  position: 'sticky',
  top: 0,
  zIndex: 2,
  textAlign: 'left',
  whiteSpace: 'nowrap',
  userSelect: 'none',
};
