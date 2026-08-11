/**
 * Group an array of entries by month based on `entry.createdAt` (ISO string).
 * Preserves the input order within each group.
 */
export function groupByMonth(entries) {
  const groups = {};
  entries.forEach(e => {
    const d = new Date(e.createdAt);
    if (Number.isNaN(d.getTime())) return;
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!groups[monthKey]) groups[monthKey] = { label: monthLabel, entries: [] };
    groups[monthKey].entries.push(e);
  });
  return Object.values(groups);
}
