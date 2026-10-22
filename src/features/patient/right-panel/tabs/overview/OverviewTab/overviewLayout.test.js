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
  const placedOnce = (l) => {
    const all = l.lanes.flat();
    expect(all).toHaveLength(OVERVIEW_WIDGET_KEYS.length);
    expect(new Set(all)).toEqual(new Set(OVERVIEW_WIDGET_KEYS));
    l.hidden.forEach(k => expect(all).toContain(k));
  };

  it('returns the default for a user with nothing saved', () => {
    const l = normalizeOverviewLayout(undefined);
    expect(l.lanes).toEqual(DEFAULT_OVERVIEW_LAYOUT.lanes);
    expect(new Set(l.hidden)).toEqual(new Set(DEFAULT_OVERVIEW_LAYOUT.hidden));
    placedOnce(l);
  });

  it('keeps every widget in exactly one lane, dropping unknown and duplicate keys', () => {
    const l = normalizeOverviewLayout({ lanes: [['synopsis', 'nope', 'synopsis'], ['tasks'], []], hidden: ['tasks', 'nope'] });
    placedOnce(l);
    expect(l.lanes[0][0]).toBe('synopsis');
    expect(l.lanes[1][0]).toBe('tasks');
    expect(l.hidden).toContain('tasks');
    expect(l.hidden).not.toContain('nope');
  });

  it('keeps a hidden widget in its lane', () => {
    const l = normalizeOverviewLayout({ lanes: [['synopsis', 'tasks'], [], []], hidden: ['tasks'] });
    expect(l.lanes[0].slice(0, 2)).toEqual(['synopsis', 'tasks']);
    expect(l.hidden).toContain('tasks');
  });

  it('places widgets the user has never seen in their default lane with default visibility', () => {
    const l = normalizeOverviewLayout({ lanes: [['synopsis'], [], []], hidden: [] });
    expect(l.lanes[2]).toContain('quickActions');
    expect(l.hidden).not.toContain('quickActions');
    expect(l.lanes[2]).toContain('insurance');
    expect(l.hidden).toContain('insurance');
  });

  it('moves widgets from the old Hidden list back into their lanes, still hidden', () => {
    // Saved before hidden widgets kept their lane: hidden ones were in no lane.
    const l = normalizeOverviewLayout({ lanes: [['synopsis'], ['carePlan'], ['tasks']], hidden: ['vitals'] });
    placedOnce(l);
    expect(l.lanes[2]).toContain('vitals');
    expect(l.hidden).toContain('vitals');
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

  it('leaves hidden widgets out', () => {
    expect(overviewColumns({ ...layout, hidden: ['b', 'd'] }, 3)).toEqual([['a'], ['c'], ['e']]);
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
