/** Shared ProfileTable columns for the Gaps tab tables (care gaps, diagnosis gaps, alerts). */
export const GAP_TABLE_COLUMNS = [
  { key: 'title', label: 'Title' },
  // Wide enough for the longest status badge ("Closed - Do not call"), so the
  // column doesn't shift when other instances expand, and Care Gaps,
  // Diagnosis Gaps and Alerts keep Status on the same line.
  { key: 'status', label: 'Status', width: 160 },
  { key: 'actions', label: '', width: 48 },
];

// Badge tone for a Diagnosis Gaps or Alerts status, matching Care Gaps
// (Open reads purple there too).
const STATUS_TONE = { Open: 'primary', Closed: 'neutral', Resolved: 'success' };
export const gapRowStatusTone = (status) => STATUS_TONE[status] || 'neutral';
