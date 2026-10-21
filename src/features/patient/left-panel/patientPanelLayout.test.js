import { describe, expect, it } from 'vitest';
import {
  applyOrder, customizeRows, isDefaultLayout, normalizeLayout, visibleTabs, visibleWidgets, EMPTY_PANEL_LAYOUT,
} from './patientPanelLayout';

const FULL = ['Gaps(11)', 'PAMI/Hx', 'Vitals/Labs', 'Comms', 'Outreach', 'Summary', 'CRM'];

describe('applyOrder', () => {
  it('follows the saved order and keeps unknown keys out', () => {
    expect(applyOrder(['a', 'b', 'c'], ['c', 'x', 'a', 'b'])).toEqual(['c', 'a', 'b']);
  });

  it('puts keys the saved order does not mention after it, in default order', () => {
    expect(applyOrder(['a', 'b', 'c', 'd'], ['c', 'a'])).toEqual(['c', 'a', 'b', 'd']);
    expect(applyOrder(['a', 'b'], [])).toEqual(['a', 'b']);
  });
});

describe('visibleTabs', () => {
  it('is the default list with no layout', () => {
    expect(visibleTabs(EMPTY_PANEL_LAYOUT, FULL)).toEqual(FULL);
  });

  it('reorders and hides, ignoring tabs this surface does not have', () => {
    const layout = { tabs: { order: ['Summary', 'Profile', 'Gaps(11)'], hidden: ['Comms', 'Tasks'] }, widgets: {} };
    expect(visibleTabs(layout, FULL)).toEqual(['Summary', 'Gaps(11)', 'PAMI/Hx', 'Vitals/Labs', 'Outreach', 'CRM']);
  });

  it('keeps one tab when every tab is switched off', () => {
    expect(visibleTabs({ tabs: { order: [], hidden: FULL }, widgets: {} }, FULL)).toEqual(['Gaps(11)']);
  });
});

describe('visibleWidgets', () => {
  it('orders and hides a tab’s widgets', () => {
    const layout = { tabs: { order: [], hidden: [] }, widgets: { 'Gaps(11)': { order: ['alerts'], hidden: ['diagnosis-gaps'] } } };
    expect(visibleWidgets(layout, 'Gaps(11)')).toEqual(['alerts', 'care-gaps']);
    expect(visibleWidgets(layout, 'Comms')).toEqual([]);
  });
});

describe('customizeRows', () => {
  it('lists every tab with its widgets and switches', () => {
    const layout = { tabs: { order: [], hidden: ['CRM'] }, widgets: { Summary: { order: [], hidden: ['insurance'] } } };
    const rows = customizeRows(layout, FULL);
    expect(rows.map(r => [r.label, r.on])).toContainEqual(['CRM', false]);
    const summary = rows.find(r => r.key === 'Summary');
    expect(summary.widgets.find(w => w.key === 'insurance').on).toBe(false);
    expect(summary.widgets).toHaveLength(9);
  });
});

describe('isDefaultLayout / normalizeLayout', () => {
  it('spots a changed layout', () => {
    expect(isDefaultLayout(EMPTY_PANEL_LAYOUT)).toBe(true);
    expect(isDefaultLayout({ tabs: { order: ['PAMI/Hx'], hidden: [] }, widgets: {} })).toBe(false);
    expect(isDefaultLayout({ tabs: { order: [], hidden: [] }, widgets: { Summary: { order: [], hidden: ['insurance'] } } })).toBe(false);
  });

  it('drops malformed parts of a stored layout', () => {
    expect(normalizeLayout(null)).toEqual(EMPTY_PANEL_LAYOUT);
    expect(normalizeLayout({ tabs: { order: ['Summary', 3] }, widgets: { Nope: {}, Summary: { hidden: ['insurance'] } } }))
      .toEqual({ tabs: { order: ['Summary'], hidden: [] }, widgets: { Summary: { order: [], hidden: ['insurance'] } } });
  });
});
