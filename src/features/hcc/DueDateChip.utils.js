export const DUE_OPTIONS = [
  'Overdue',
  'Due Today',
  'Due This Week',
  'Due Next Week',
  'Due More Than 2 Weeks',
];

/** Convert a member's `due` string to a Due Date category. */
export function getDueCategory(due) {
  if (!due) return null;
  if (/^overdue/i.test(due)) return 'Overdue';
  if (due === 'Due Today') return 'Due Today';
  const m = due.match(/due in (\d+)\s*d/i) || due.match(/due in (\d+)\s*days?/i);
  if (m) {
    const days = parseInt(m[1], 10);
    if (days <= 7) return 'Due This Week';
    if (days <= 14) return 'Due Next Week';
    return 'Due More Than 2 Weeks';
  }
  return null;
}
