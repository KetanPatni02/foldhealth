/**
 * The patient profile's left panel: its tabs and the widgets inside each,
 * and how a user's saved layout (order + on/off) applies to them.
 *
 * Tab keys are the tab labels the panel already routes by ('Gaps(11)', …).
 * Tabs without widgets (Comms, CRM, …) can be reordered and switched off as a
 * whole. Anything a saved layout doesn't mention (a tab or widget added later)
 * is on and follows the saved ones.
 *
 * Layout shape: { tabs: { order: [key], hidden: [key] },
 *                 widgets: { [tabKey]: { order: [key], hidden: [key] } } }
 */

export const PANEL_LAYOUT_KEY = 'patient-left-panel';

export const PANEL_TABS = [
  {
    key: 'Gaps(11)',
    label: 'Gaps',
    widgets: [
      { key: 'care-gaps', label: 'Care Gaps' },
      { key: 'diagnosis-gaps', label: 'Diagnosis Gaps' },
      { key: 'alerts', label: 'Alerts' },
    ],
  },
  {
    key: 'PAMI/Hx',
    label: 'PAMI/Hx',
    widgets: [
      { key: 'clinical-events', label: 'Recent Clinical Events' },
      { key: 'problems', label: 'Problems' },
      { key: 'allergies', label: 'Allergies' },
      { key: 'medications', label: 'Medications' },
      { key: 'immunizations', label: 'Immunizations' },
      { key: 'history', label: 'History' },
      { key: 'lab-reports', label: 'Lab Reports' },
      { key: 'imaging-reports', label: 'Imaging Reports' },
    ],
  },
  {
    key: 'Vitals/Labs',
    label: 'Vitals/Labs',
    widgets: [
      { key: 'vitals', label: 'Vitals' },
      { key: 'biomarkers', label: 'Biomarkers' },
      { key: 'activity', label: 'Activity' },
      { key: 'lab', label: 'Lab Monitoring' },
    ],
  },
  { key: 'Comms', label: 'Comms', widgets: [] },
  { key: 'Outreach', label: 'Outreach', widgets: [] },
  {
    key: 'Summary',
    label: 'Summary',
    widgets: [
      { key: 'health-map', label: 'Health Map' },
      { key: 'synopsis', label: 'Patient Synopsis' },
      { key: 'utilization', label: 'Care Utilization Summary' },
      { key: 'prior-auth', label: 'Prior Authorization Requests' },
      { key: 'population-groups', label: 'Population Groups' },
      { key: 'care-journeys', label: 'Care Journeys' },
      { key: 'subscription', label: 'Subscription' },
      { key: 'automations', label: 'Active Automations' },
      { key: 'insurance', label: 'Insurance' },
    ],
  },
  { key: 'Tasks', label: 'Tasks', widgets: [] },
  { key: 'CRM', label: 'CRM', widgets: [] },
  { key: 'Profile', label: 'Profile', widgets: [] },
];

const TAB_BY_KEY = new Map(PANEL_TABS.map(t => [t.key, t]));

export const EMPTY_PANEL_LAYOUT = { tabs: { order: [], hidden: [] }, widgets: {} };

/**
 * `keys` in the saved order. The drawer always saves a full order, so keys it
 * doesn't mention are ones added since; they follow, in default order.
 */
export function applyOrder(keys, savedOrder = []) {
  const known = new Set(keys);
  const saved = savedOrder.filter(k => known.has(k));
  const savedSet = new Set(saved);
  return [...saved, ...keys.filter(k => !savedSet.has(k))];
}

/** The tabs to show, in order: `available` (the surface's tab keys) after the user's order and switches. */
export function visibleTabs(layout, available) {
  const hidden = new Set(layout?.tabs?.hidden || []);
  const shown = applyOrder(available, layout?.tabs?.order).filter(k => !hidden.has(k));
  // Never leave the panel empty: with every tab off, fall back to the first.
  return shown.length ? shown : available.slice(0, 1);
}

/** A tab's widget keys to render, in order, without the switched-off ones. */
export function visibleWidgets(layout, tabKey) {
  const tab = TAB_BY_KEY.get(tabKey);
  if (!tab) return [];
  const saved = layout?.widgets?.[tabKey];
  const hidden = new Set(saved?.hidden || []);
  return applyOrder(tab.widgets.map(w => w.key), saved?.order).filter(k => !hidden.has(k));
}

/** Rows for the Customize drawer: every tab on `available`, in order, with its widgets and switches. */
export function customizeRows(layout, available) {
  const hiddenTabs = new Set(layout?.tabs?.hidden || []);
  return applyOrder(available, layout?.tabs?.order).map((key) => {
    const tab = TAB_BY_KEY.get(key) || { key, label: key, widgets: [] };
    const saved = layout?.widgets?.[key];
    const hiddenWidgets = new Set(saved?.hidden || []);
    const byKey = new Map(tab.widgets.map(w => [w.key, w]));
    return {
      key,
      label: tab.label,
      on: !hiddenTabs.has(key),
      widgets: applyOrder(tab.widgets.map(w => w.key), saved?.order)
        .map(k => ({ ...byKey.get(k), on: !hiddenWidgets.has(k) })),
    };
  });
}

/** True when nothing differs from the default layout. */
export function isDefaultLayout(layout) {
  if (!layout) return true;
  const changedTabs = (layout.tabs?.hidden?.length || 0) > 0
    || PANEL_TABS.map(t => t.key).join() !== applyOrder(PANEL_TABS.map(t => t.key), layout.tabs?.order).join();
  if (changedTabs) return false;
  return PANEL_TABS.every((t) => {
    const saved = layout.widgets?.[t.key];
    const keys = t.widgets.map(w => w.key);
    return !(saved?.hidden?.length) && keys.join() === applyOrder(keys, saved?.order).join();
  });
}

/** Read a stored layout, dropping anything malformed. */
export function normalizeLayout(raw) {
  const list = v => (Array.isArray(v) ? v.filter(x => typeof x === 'string') : []);
  if (!raw || typeof raw !== 'object') return EMPTY_PANEL_LAYOUT;
  const widgets = {};
  for (const [tabKey, w] of Object.entries(raw.widgets || {})) {
    if (TAB_BY_KEY.has(tabKey) && w && typeof w === 'object') widgets[tabKey] = { order: list(w.order), hidden: list(w.hidden) };
  }
  return { tabs: { order: list(raw.tabs?.order), hidden: list(raw.tabs?.hidden) }, widgets };
}
