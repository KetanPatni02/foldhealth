/**
 * Employer Impact Report: the viewer's dashboard layout, kept separately
 * for each location view (Patient / Visit), since the two show different
 * sections. For each: which sections come first, the widget order inside
 * each, and which widgets are hidden. Set from the Update Dashboard drawer
 * and the Widget picker.
 *
 * One layout: `{ sections: string[], widgets: { [sectionId]: string[] }, hidden: string[] }`.
 * Stored: `{ patient: layout, visit: layout }`.
 * Widget keys are the config keys; cost savings cards are `savings:<category>`.
 */
import { WIDGETS, SAVINGS_CATEGORIES, LOCATION_SCOPES, sectionsForScope } from './employerImpactConfig';

const LAYOUTS_KEY = 'employer-impact-layouts';
// Earlier versions saved one layout for both views, and before that only
// the hidden widgets. Either is read as the starting point for both views.
const LEGACY_LAYOUT_KEY = 'employer-impact-layout';
const LEGACY_HIDDEN_KEY = 'employer-impact-hidden-widgets';

export const savingsKey = (category) => `savings:${category}`;

function sectionWidgetKeys(sectionId) {
  if (sectionId === 'costSavings') return SAVINGS_CATEGORIES.map(c => savingsKey(c.key));
  return WIDGETS.filter(w => w.section === sectionId).map(w => w.key);
}

/** A view's sections and widgets in config order, all visible. */
export function defaultLayout(scope = 'patient') {
  const sections = sectionsForScope(scope).map(s => s.id);
  return {
    sections,
    widgets: Object.fromEntries(sections.map(id => [id, sectionWidgetKeys(id)])),
    hidden: [],
  };
}

/** Keep `saved` order for keys that still exist; append new ones at the end. */
function mergeOrder(saved, current) {
  const known = new Set(current);
  const kept = (Array.isArray(saved) ? saved : []).filter(k => known.has(k));
  const keptSet = new Set(kept);
  return [...kept, ...current.filter(k => !keptSet.has(k))];
}

/**
 * A saved layout reconciled with today's config for `scope`: sections or
 * widgets added since it was saved appear (visible), and ones removed, or
 * not part of this view, are dropped. A stale layout never hides new
 * charts or references missing ones.
 */
export function normalizeLayout(saved, scope = 'patient') {
  const base = defaultLayout(scope);
  if (!saved || typeof saved !== 'object') return base;
  const allKeys = new Set(Object.values(base.widgets).flat());
  return {
    sections: mergeOrder(saved.sections, base.sections),
    widgets: Object.fromEntries(base.sections.map(id => [id, mergeOrder(saved.widgets?.[id], base.widgets[id])])),
    hidden: (Array.isArray(saved.hidden) ? saved.hidden : []).filter(k => allKeys.has(k)),
  };
}

/** Both views' layouts, each reconciled with the config. */
export function normalizeLayouts(saved) {
  return Object.fromEntries(LOCATION_SCOPES.map(scope => [scope, normalizeLayout(saved?.[scope], scope)]));
}

// The layout is a per-viewer convenience, so it lives in this browser.
export function readLayouts() {
  try {
    const raw = localStorage.getItem(LAYOUTS_KEY);
    if (raw) return normalizeLayouts(JSON.parse(raw));
    const legacyLayout = localStorage.getItem(LEGACY_LAYOUT_KEY);
    const legacyHidden = localStorage.getItem(LEGACY_HIDDEN_KEY);
    const legacy = legacyLayout ? JSON.parse(legacyLayout) : legacyHidden ? { hidden: JSON.parse(legacyHidden) } : null;
    return normalizeLayouts(legacy ? { patient: legacy, visit: legacy } : null);
  } catch {
    return normalizeLayouts(null);
  }
}

export function writeLayouts(layouts) {
  try { localStorage.setItem(LAYOUTS_KEY, JSON.stringify(layouts)); } catch { /* storage unavailable */ }
}

// ── Grid packing ──
export const GRID_COLUMNS = 6;
export const SPAN_COLUMNS = { full: 6, twoThirds: 4, half: 3, third: 2 };

/**
 * Column spans for widgets laid out in order on a `cols`-wide grid, with
 * no gaps. Widgets fill a row in their saved order by preferred span; when
 * the next one doesn't fit, the row closes. A row that is already full
 * keeps its designed widths; one with space left over is split equally
 * between its widgets. So any reordering still yields full rows, and the
 * order the viewer chose is kept.
 *
 * @param {number[]} spans – Preferred spans, each 1…cols
 * @returns {number[]} Spans, same order
 */
export function packSpans(spans, cols = GRID_COLUMNS) {
  const out = [];
  let row = [];
  const closeRow = () => {
    if (!row.length) return;
    if (row.reduce((a, b) => a + b, 0) === cols) { out.push(...row); row = []; return; }
    // Equal shares; if cols doesn't divide evenly, the first few get one extra.
    const base = Math.floor(cols / row.length);
    const extra = cols - base * row.length;
    row.forEach((_, i) => out.push(base + (i < extra ? 1 : 0)));
    row = [];
  };
  let used = 0;
  for (const raw of spans) {
    const span = Math.min(cols, Math.max(1, raw));
    if (used + span > cols) { closeRow(); used = 0; }
    row.push(span);
    used += span;
  }
  closeRow();
  return out;
}
