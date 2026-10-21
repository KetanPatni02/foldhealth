import { describe, expect, it } from 'vitest';
import { OVERVIEW_COLUMNS, overviewColumnCount } from './overviewLayout';

describe('overviewColumnCount', () => {
  it('gives three columns only when the left panel is collapsed and the overview is wide', () => {
    expect(overviewColumnCount(1600, { leftPanelOpen: false })).toBe(3);
    expect(overviewColumnCount(1600, { leftPanelOpen: true })).toBe(2);
  });

  it('matches the Figma frames', () => {
    // 1728 screen, panel collapsed
    expect(overviewColumnCount(1630, { leftPanelOpen: false })).toBe(3);
    // 1280 screen, panel collapsed
    expect(overviewColumnCount(1190, { leftPanelOpen: false })).toBe(2);
    // 1920 screen, panel open
    expect(overviewColumnCount(1330, { leftPanelOpen: true })).toBe(2);
    // 1728 screen, panel open
    expect(overviewColumnCount(1110, { leftPanelOpen: true })).toBe(1);
  });

  it('falls back to one column when narrow', () => {
    expect(overviewColumnCount(700, { leftPanelOpen: false })).toBe(1);
  });
});

describe('OVERVIEW_COLUMNS', () => {
  it('places every card exactly once at every column count', () => {
    const all = OVERVIEW_COLUMNS[1][0];
    for (const count of [1, 2, 3]) {
      const flat = OVERVIEW_COLUMNS[count].flat();
      expect(flat).toHaveLength(all.length);
      expect(new Set(flat)).toEqual(new Set(all));
    }
  });

  it('opens the first column with the synopsis and health chart', () => {
    for (const count of [1, 2, 3]) {
      expect(OVERVIEW_COLUMNS[count][0].slice(0, 2)).toEqual(['synopsis', 'healthChart']);
    }
  });

  it('keeps Quick Actions directly above Upcoming Appointments', () => {
    for (const count of [1, 2, 3]) {
      const col = OVERVIEW_COLUMNS[count].find(c => c.includes('quickActions'));
      expect(col[col.indexOf('quickActions') + 1]).toBe('appointments');
    }
  });
});
