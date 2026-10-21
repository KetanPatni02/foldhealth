// Overview tab layout: which widgets show, in which lane, in what order.
//
// The user arranges three lanes (Customize). The column count follows the
// Overview's own width (not the window), so the left panel being open,
// closed or dragged wider is handled in one place. With the left panel open
// it already reads as a column, so the Overview tops out at two; collapsed, a
// wide Overview gets three (25% / 50% / 25%).
//
// Folding: 3 columns show the lanes as they are; 2 columns stack lanes 1 and
// 3 in the narrow column and give lane 2 the wide one; 1 column stacks the
// lanes in order.

export const TWO_COLUMN_MIN_WIDTH = 1150;
export const THREE_COLUMN_MIN_WIDTH = 1400;

export function overviewColumnCount(width, { leftPanelOpen }) {
  if (!leftPanelOpen && width >= THREE_COLUMN_MIN_WIDTH) return 3;
  if (width >= TWO_COLUMN_MIN_WIDTH) return 2;
  return 1;
}

export const LANE_LABELS = ['Column 1', 'Column 2', 'Column 3'];
export const LANE_HINTS = ['Narrow, left', 'Wide, middle', 'Narrow, right'];

// Every widget the Overview can show. `group` only sorts the hidden list in
// Customize. `sample` marks widgets reused from the left panel Summary tab
// that still show built-in sample data rather than this patient's.
export const OVERVIEW_WIDGETS = [
  { key: 'synopsis', label: 'Patient Synopsis', group: 'Summary' },
  { key: 'healthChart', label: 'Health Chart', group: 'Summary' },
  { key: 'riskAcuity', label: 'Risk & Acuity', group: 'Summary' },
  { key: 'highlights', label: 'Highlights', group: 'Summary' },
  { key: 'suggestedActions', label: 'Suggested Actions', group: 'Actions' },
  { key: 'quickActions', label: 'Quick Actions', group: 'Actions' },
  { key: 'carePlan', label: 'Care Plan', group: 'Programs' },
  { key: 'carePrograms', label: 'Active Care Programs', group: 'Programs' },
  { key: 'programProgress', label: 'Program Progress', group: 'Programs' },
  { key: 'consent', label: 'Consent', group: 'Programs' },
  { key: 'gaps', label: 'Gaps', group: 'Clinical' },
  { key: 'vitals', label: 'Vitals', group: 'Clinical' },
  { key: 'medications', label: 'Medications', group: 'Clinical' },
  { key: 'conditions', label: 'Diagnoses & Problems', group: 'Clinical' },
  { key: 'notes', label: 'Recent Notes', group: 'Engagement' },
  { key: 'appointments', label: 'Upcoming Appointments', group: 'Engagement' },
  { key: 'tasks', label: 'Tasks', group: 'Engagement' },
  { key: 'sinceLastTouch', label: 'Since Last Touch', group: 'Engagement' },
  { key: 'contact', label: 'Contact & Reachability', group: 'Engagement' },
  { key: 'careTeam', label: 'Care Team', group: 'People' },
  { key: 'caregivers', label: 'Caregiver & Family', group: 'People' },
  { key: 'careUtilization', label: 'Care Utilization Summary', group: 'Summary tab', sample: true },
  { key: 'priorAuth', label: 'Prior Authorization Requests', group: 'Summary tab', sample: true },
  { key: 'populationGroups', label: 'Population Groups', group: 'Summary tab', sample: true },
  { key: 'careJourneys', label: 'Care Journeys', group: 'Summary tab', sample: true },
  { key: 'automations', label: 'Active Automations', group: 'Summary tab', sample: true },
  { key: 'insurance', label: 'Insurance', group: 'Summary tab', sample: true },
  { key: 'subscription', label: 'Subscription', group: 'Summary tab', sample: true },
];

export const OVERVIEW_WIDGET_KEYS = OVERVIEW_WIDGETS.map(w => w.key);
const KNOWN = new Set(OVERVIEW_WIDGET_KEYS);

// Synopsis and Health Chart open the first lane; Quick Actions sits directly
// above Upcoming Appointments. Anything not in a lane starts hidden.
export const DEFAULT_OVERVIEW_LAYOUT = {
  lanes: [
    ['synopsis', 'healthChart', 'riskAcuity', 'highlights'],
    ['suggestedActions', 'carePlan', 'carePrograms', 'gaps', 'notes'],
    ['quickActions', 'appointments', 'contact', 'tasks', 'vitals', 'careTeam'],
  ],
};

export function defaultHidden() {
  const placed = new Set(DEFAULT_OVERVIEW_LAYOUT.lanes.flat());
  return OVERVIEW_WIDGET_KEYS.filter(k => !placed.has(k));
}

/**
 * Saved layout → a complete, valid one. Drops unknown or duplicate keys, and
 * places widgets the user has never seen (added after they last saved) where
 * the default puts them, so a new widget shows up instead of staying hidden.
 */
export function normalizeOverviewLayout(saved) {
  const lanes = [[], [], []];
  const seen = new Set();
  const take = (k) => {
    if (!KNOWN.has(k) || seen.has(k)) return false;
    seen.add(k);
    return true;
  };
  const savedLanes = Array.isArray(saved?.lanes) ? saved.lanes : DEFAULT_OVERVIEW_LAYOUT.lanes;
  savedLanes.slice(0, 3).forEach((lane, i) => {
    (Array.isArray(lane) ? lane : []).forEach((k) => { if (take(k)) lanes[i].push(k); });
  });
  const hidden = (Array.isArray(saved?.hidden) ? saved.hidden : (saved ? [] : defaultHidden())).filter(take);
  // Widgets neither placed nor hidden by the user are new to them.
  DEFAULT_OVERVIEW_LAYOUT.lanes.forEach((lane, i) => {
    lane.forEach((k) => { if (take(k)) lanes[i].push(k); });
  });
  OVERVIEW_WIDGET_KEYS.forEach((k) => { if (take(k)) hidden.push(k); });
  return { lanes, hidden };
}

/** The visible columns for a column count, folded from the three lanes. */
export function overviewColumns(layout, count) {
  const [a, b, c] = layout.lanes;
  if (count === 3) return [a, b, c];
  if (count === 2) return [[...a, ...c], b];
  return [[...a, ...b, ...c]];
}

// Relative column widths: 25 / 50 / 25 at three, 1/3 + 2/3 at two.
export const OVERVIEW_COLUMN_TEMPLATE = {
  3: '1fr 2fr 1fr',
  2: '1fr 2fr',
  1: 'minmax(0, 1fr)',
};
