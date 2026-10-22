import { describe, it, expect } from 'vitest';
import { applyPickup, applyRecentFill, projectedPdc, recomputeMeasure, setsRecentFill, withManualRecentFill } from './fillEvents';

// Claims 08/01 and 09/01, 30 days each (measure year 2026).
const claims = [{ date: '09/01/2026', daysSupply: 30 }, { date: '08/01/2026', daysSupply: 30 }];
const med = (o = {}) => ({
  id: 'm1', name: 'Metformin', status: 'Active', daysSupply: 30, lastFill: '09/01/2026', nextFill: '10/01/2026',
  refills: claims, ...o,
});
const gap = (o = {}) => ({ code: 'MAD', pdc: 70, failDate: '12/15/2026', nextFillDue: '10/01/2026', medications: [med()], ...o });
const member = (x) => ({ measures: [x] });
const PICKUP = 'Pharmacy · Confirmed medication pickup date';
const APPROVAL = 'Pharmacy · Refill approval received';

describe('Recent Fill outcomes', () => {
  it('fires on pickup confirmed and refill approval received, with or without the stakeholder prefix', () => {
    expect(setsRecentFill(PICKUP)).toBe(true);
    expect(setsRecentFill('Confirmed medication pickup')).toBe(true);
    expect(setsRecentFill(APPROVAL)).toBe(true);
    expect(setsRecentFill('Pharmacy · Pending — Refill approval')).toBe(false);
    expect(setsRecentFill('UTC')).toBe(false);
  });

  it('keeps Last Fill as the claims date and moves Next Fill from the recent fill', () => {
    const [x] = applyRecentFill(member(gap()), ['MAD'], '10/22/2026', APPROVAL);
    expect(x.medications[0]).toMatchObject({ lastFill: '09/01/2026', recentFill: '10/22/2026', nextFill: '11/21/2026' });
    expect(x.medications[0].recentFillSource).toMatchObject({ outcome: APPROVAL, manual: false });
    expect(x.nextFillDue).toBe('11/21/2026');
  });
});

describe('newer-date guard', () => {
  const later = withManualRecentFill(gap(), 'm1', '11/15/2026');

  it('an older pickup, then the recent-fill step, leaves a newer Recent Fill in place', () => {
    // logPharmacyOutreach runs applyPickup, then applyRecentFill, for a pickup outcome.
    const { measures } = applyPickup(member(later), ['MAD'], '10/22/2026', 'Pickup confirmed by call');
    const [x] = applyRecentFill({ measures }, ['MAD'], '10/22/2026', PICKUP);
    expect(x.medications[0].recentFill).toBe('11/15/2026');
    expect(x.medications[0].nextFill).toBe('12/15/2026');
  });

  it('an older refill approval does not overwrite it either', () => {
    const [x] = applyRecentFill(member(later), ['MAD'], '10/22/2026', APPROVAL);
    expect(x.medications[0].recentFill).toBe('11/15/2026');
  });

  it('a hand-entered date may still be earlier', () => {
    const x = withManualRecentFill(later, 'm1', '10/05/2026');
    expect(x.medications[0]).toMatchObject({ recentFill: '10/05/2026', recentFillSource: { manual: true } });
  });
});

describe('projected PDC', () => {
  it('claims only: 60 of 153 days', () => {
    expect(projectedPdc(gap())).toBe(39);
  });

  it('a confirmed fill on the same day as a claim is the same fill, not a second supply', () => {
    const x = withManualRecentFill(gap(), 'm1', '09/01/2026');
    expect(x.pdcProjected).toBe(39);
    expect(x.medications[0].nextFill).toBe('10/01/2026');
  });

  it('every confirmed pickup counts, not just the latest', () => {
    let { measures } = applyPickup(member(gap()), ['MAD'], '09/15/2026', 'Pickup confirmed by call');
    ({ measures } = applyPickup({ measures }, ['MAD'], '10/20/2026', 'Pickup confirmed by call'));
    // Covered: Aug 1–30, Sep 1–30, then the pickups shifted to Oct 1–30 and
    // Oct 31–Nov 29: 120 of 153 days.
    expect(measures[0].pdcProjected).toBe(78);
    expect(measures[0].medications[0].recentFill).toBe('10/20/2026');
  });

  it('a refill approval is kept in the history and counted', () => {
    const [x] = applyRecentFill(member(gap()), ['MAD'], '10/22/2026', APPROVAL);
    expect(x.medications[0].refills[0]).toMatchObject({ date: '10/22/2026', source: APPROVAL });
    expect(x.pdcProjected).toBeGreaterThan(39);
  });

  it('next fill and PDC use the same shifted schedule', () => {
    // Recent fill 09/10 starts when the 09/01 supply runs out (10/01).
    const x = withManualRecentFill(gap(), 'm1', '09/10/2026');
    expect(x.medications[0].nextFill).toBe('10/31/2026');
    expect(x.nextFillDue).toBe('10/31/2026');
  });

  it('drops back to the plan PDC when the confirmed fill is removed', () => {
    const x = withManualRecentFill(withManualRecentFill(gap(), 'm1', '10/22/2026'), 'm1', null);
    expect(x.pdcProjected).toBeNull();
    expect(x.medications[0].nextFill).toBe('10/01/2026');
  });
});

describe('discontinued drugs', () => {
  it('leave Next Fill Due once recomputed, but their dispensed days still count', () => {
    const b = med({ id: 'm2', name: 'Glipizide', lastFill: '10/10/2026', nextFill: '11/09/2026', refills: [{ date: '10/10/2026', daysSupply: 30 }] });
    const x = withManualRecentFill(gap({ medications: [med(), b] }), 'm1', '10/05/2026');
    // m1's 10/05 fill starts after its 09/01 supply ends, so no shift: 11/04.
    expect(x.nextFillDue).toBe('11/04/2026');
    const dc = recomputeMeasure({ ...x, medications: x.medications.map(d => (d.id === 'm1' ? { ...d, status: 'Discontinued' } : d)) });
    expect(dc.nextFillDue).toBe('11/09/2026');
    expect(projectedPdc(dc)).toBeGreaterThanOrEqual(39);
  });
});
