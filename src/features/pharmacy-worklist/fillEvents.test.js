import { describe, it, expect } from 'vitest';
import { applyPickup, applyRecentFill, projectedPdc, setsRecentFill, withRecentFill } from './fillEvents';

const med = (o = {}) => ({
  id: 'm1', name: 'Metformin', status: 'Active', daysSupply: 30, lastFill: '09/01/2026', nextFill: '10/01/2026',
  refills: [{ date: '09/01/2026', daysSupply: 30 }, { date: '08/01/2026', daysSupply: 30 }],
  ...o,
});
const gap = (o = {}) => ({ code: 'MAD', pdc: 70, failDate: '12/15/2026', nextFillDue: '10/01/2026', medications: [med()], ...o });

describe('Recent Fill automation', () => {
  it('fires on pickup confirmed and refill approval received, with or without the stakeholder prefix', () => {
    expect(setsRecentFill('Pharmacy · Confirmed medication pickup date')).toBe(true);
    expect(setsRecentFill('Confirmed medication pickup')).toBe(true);
    expect(setsRecentFill('Pharmacy · Refill approval received')).toBe(true);
    expect(setsRecentFill('Pharmacy · Pending — Refill approval')).toBe(false);
    expect(setsRecentFill('UTC')).toBe(false);
  });

  it('keeps Last Fill as the claims date and moves Next Fill from the recent fill', () => {
    const [x] = applyRecentFill({ measures: [gap()] }, ['MAD'], '10/22/2026', 'Pharmacy · Refill approval received');
    expect(x.medications[0]).toMatchObject({ lastFill: '09/01/2026', recentFill: '10/22/2026', nextFill: '11/21/2026' });
    expect(x.nextFillDue).toBe('11/21/2026');
    expect(x.medications[0].recentFillSource).toMatchObject({ outcome: 'Pharmacy · Refill approval received', manual: false });
  });

  it('projects PDC with the recent fill and drops back to the plan PDC when it is cleared', () => {
    const withFill = withRecentFill(gap(), '10/22/2026', { manual: true });
    expect(withFill.pdcProjected).toBe(projectedPdc(withFill));
    expect(withFill.pdcProjected).toBeGreaterThan(projectedPdc(gap()));
    const cleared = withRecentFill(withFill, null, null);
    expect(cleared.pdcProjected).toBeNull();
    expect(cleared.medications[0].nextFill).toBe('10/01/2026');
  });

  it('a pickup sets Recent Fill instead of overwriting Last Fill', () => {
    const { measures: [x] } = applyPickup({ measures: [gap()] }, ['MAD'], '10/20/2026', 'Pickup confirmed by call');
    expect(x.medications[0].lastFill).toBe('09/01/2026');
    expect(x.medications[0].recentFill).toBe('10/20/2026');
    expect(x.pickupConfirmed).toBe('10/20/2026');
    expect(x.nextFillDue).toBe('11/19/2026');
  });
});
