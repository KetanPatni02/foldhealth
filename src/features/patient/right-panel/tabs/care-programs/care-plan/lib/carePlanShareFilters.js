export const SHARE_GBI_STATUSES = ['Not Started', 'In Progress', 'On Hold', 'Met', 'Not Met'];
export const SHARE_PRIORITY_LABELS = ['High', 'Medium', 'Low'];

export const SHARE_DATE_OPTIONS = [
  { key: 'all', label: 'All time' },
  { key: 'sinceVisit', label: 'Since last visit' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
];

export const SHARE_FILTERS_DEFAULT = {
  datePreset: 'all',
  status: [],
  priority: [],
  assignee: [],
  conditions: [],
};

/** ISO timestamp on the row — prefers last update, then create. */
export function shareItemTimestamp(item) {
  const raw = item?.updatedAt || item?.createdAt;
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : null;
}

export function matchesShareDatePreset(item, datePreset, lastVisitIso) {
  if (!datePreset || datePreset === 'all') return true;
  const t = shareItemTimestamp(item);
  if (t == null) return true;
  if (datePreset === 'sinceVisit') {
    let cutoff = Date.now() - 30 * 86400000;
    if (lastVisitIso) {
      const lv = new Date(lastVisitIso).getTime();
      if (Number.isFinite(lv)) cutoff = lv;
    }
    return t >= cutoff;
  }
  if (datePreset === '30d') return t >= Date.now() - 30 * 86400000;
  if (datePreset === '90d') return t >= Date.now() - 90 * 86400000;
  return true;
}

/** When plan condition labels are selected, keep rows whose text/tags mention one. */
export function matchesShareConditionFilter(item, selectedLabels) {
  if (!selectedLabels?.length) return true;
  const hay = [
    ...(Array.isArray(item?.conditions) ? item.conditions : []),
    item?.title || '',
    item?.subtitle || '',
    item?.category || '',
  ].join(' ').toLowerCase();
  return selectedLabels.some((label) => {
    const l = String(label || '').trim().toLowerCase();
    if (!l) return false;
    if (hay.includes(l)) return true;
    const stem = l.split(/\s+/).find(w => w.length > 3);
    return stem ? hay.includes(stem) : false;
  });
}

export function matchesShareFilters(item, filters, { lastVisitIso, kind } = {}) {
  const status = item?.status || 'Not Started';
  if (filters.status?.length && !filters.status.includes(status)) return false;

  if (!matchesShareConditionFilter(item, filters.conditions)) return false;

  if (filters.priority?.length) {
    const p = (item?.priority || 'medium').toLowerCase();
    const allowed = filters.priority.map(x => String(x).toLowerCase());
    if (!allowed.includes(p)) return false;
  }

  if (kind === 'intervention' && filters.assignee?.length) {
    const name = item?.assignee?.name;
    if (!name || !filters.assignee.includes(name)) return false;
  }

  if (!matchesShareDatePreset(item, filters.datePreset, lastVisitIso)) return false;
  return true;
}

export function isShareFiltersActive(filters) {
  return (
    (filters.datePreset && filters.datePreset !== 'all')
    || (filters.status?.length > 0)
    || (filters.priority?.length > 0)
    || (filters.assignee?.length > 0)
    || (filters.conditions?.length > 0)
  );
}
