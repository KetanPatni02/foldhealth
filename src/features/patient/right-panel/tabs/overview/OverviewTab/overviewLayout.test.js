import { describe, expect, it } from 'vitest';
import {
  DEFAULT_OVERVIEW_LAYOUT, OVERVIEW_WIDGET_KEYS, normalizeOverviewLayout, overviewColumnCount, overviewColumns,
} from './overviewLayout';

describe('overviewColumnCount', () => {
  it('gives three columns only when the left panel is collapsed and the overview is wide', () => {
    expect(overviewColumnCount(1600, { leftPanelOpen: false })).toBe(3);
    expect(overviewColumnCount(1600, { leftPanelOpen: true })).toBe(2);
  });

  it('matches the Figma frames', () => {
    expect(overviewColumnCount(1630, { leftPanelOpen: false })).toBe(3); // 1728, panel collapsed
    expect(overviewColumnCount(1190, { leftPanelOpen: false })).toBe(2); // 1280, panel collapsed
    expect(overviewColumnCount(1330, { leftPanelOpen: true })).toBe(2); // 1920, panel open
    expect(overviewColumnCount(1110, { leftPanelOpen: true })).toBe(1); // 1728, panel open
  });

  it('falls back to one column when narrow', () => {
    expect(overviewColumnCount(700, { leftPanelOpen: false })).toBe(1);
  });
});

describe('normalizeOverviewLayout', () => {
  it('returns the default for a user with nothing saved', () => {
    const l = normalizeOverviewLayout(undefined);
    expect(l.lanes).toEqual(DEFAULT_OVERVIEW_LAYOUT.lanes);
    expect([...l.lanes.flat(), ...l.hidden].sort()).toEqual([...OVERVIEW_WIDGET_KEYS].sort());
  });

  it('keeps every widget exactly once, dropping unknown and duplicate keys', () => {
    const l = normalizeOverviewLayout({ lanes: [['synopsis', 'nope', 'synopsis'], ['tasks'], []], hidden: ['tasks', 'vitals'] });
    const all = [...l.lanes.flat(), ...l.hidden];
    expect(all).toHaveLength(OVERVIEW_WIDGET_KEYS.length);
    expect(new Set(all).size).toBe(all.length);
    expect(l.lanes[0][0]).toBe('synopsis');
    expect(l.lanes[1][0]).toBe('tasks');
    expect(l.hidden).toContain('vitals');
  });

  it('respects a widget the user hid', () => {
    const l = normalizeOverviewLayout({ lanes: [[], [], []], hidden: ['synopsis'] });
    expect(l.hidden).toContain('synopsis');
    expect(l.lanes.flat()).not.toContain('synopsis');
  });

  it('places widgets the user has never seen where the default puts them', () => {
    const l = normalizeOverviewLayout({ lanes: [['synopsis'], [], []], hidden: [] });
    expect(l.lanes[2]).toContain('quickActions');
    expect(l.hidden).toContain('insurance');
  });
});

describe('overviewColumns', () => {
  const layout = { lanes: [['a', 'b'], ['c'], ['d', 'e']], hidden: [] };

  it('shows the lanes as they are at three columns', () => {
    expect(overviewColumns(layout, 3)).toEqual([['a', 'b'], ['c'], ['d', 'e']]);
  });

  it('stacks lanes 1 and 3 in the narrow column at two', () => {
    expect(overviewColumns(layout, 2)).toEqual([['a', 'b', 'd', 'e'], ['c']]);
  });

  it('stacks all lanes in order at one', () => {
    expect(overviewColumns(layout, 1)).toEqual([['a', 'b', 'c', 'd', 'e']]);
  });

  it('keeps the default Overview rules: synopsis and chart first, Quick Actions above appointments', () => {
    const l = normalizeOverviewLayout(undefined);
    for (const count of [1, 2, 3]) {
      const cols = overviewColumns(l, count);
      expect(cols[0].slice(0, 2)).toEqual(['synopsis', 'healthChart']);
      const col = cols.find(c => c.includes('quickActions'));
      expect(col[col.indexOf('quickActions') + 1]).toBe('appointments');
    }
  });
});
