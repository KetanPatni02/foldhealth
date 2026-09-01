const GBI_PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

function parseSortNumber(value) {
  if (value == null || value === '' || value === '-') return -1;
  const n = Number(value);
  return Number.isFinite(n) ? n : -1;
}

function normalizeSortText(value) {
  if (value == null || value === '' || value === 'No Data') return '';
  return String(value);
}

export function enrichGoalRows(rows) {
  return (rows || []).map((g) => ({
    ...g,
    _sortPriority: GBI_PRIORITY_RANK[String(g.priority || '').toLowerCase()] ?? 99,
    _sortValue: normalizeSortText(g.currentValue),
    _sortProgress: parseSortNumber(g.progress),
  }));
}

export function enrichInterventionRows(rows) {
  return (rows || []).map((i) => ({
    ...i,
    _sortPriority: GBI_PRIORITY_RANK[String(i.priority || '').toLowerCase()] ?? 99,
    _sortAssignee: i.assignee?.name === 'Unassigned' ? '' : (i.assignee?.name || ''),
    _sortAdherence: parseSortNumber(i.adherence),
  }));
}
