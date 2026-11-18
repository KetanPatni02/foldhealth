import { describe, expect, it } from 'vitest';
import { fillLengths, fillTypeLabel, gapWorkRank, isShortFillCandidate, unableToReach } from './pharmacyWorklist.utils';

const DONE = new Set(['Closed', 'Met for Year', 'Failed for Year', 'Excluded']);
const status = (gap, reopenReason = null) => ({ gap, reopenReason, done: DONE.has(gap) });
const gap = (o = {}) => ({ status: status('In Progress'), savability: 'Savable', pdc: 85, allowableGapDays: 40, nextFillDue: null, recon: null, ...o });

describe('default work order (gapWorkRank)', () => {
  it('puts a claim reversal first and not savable last', () => {
    expect(gapWorkRank(gap({ status: status('Reopened', 'Claim reversal') }))).toBe(1);
    expect(gapWorkRank(gap({ savability: 'Not savable', status: status('Failed for Year') }))).toBe(9);
  });

  it('ranks savable under 80%, then low allowable days, then 80 to 90% with the fill due', () => {
    expect(gapWorkRank(gap({ pdc: 74 }))).toBe(2);
    expect(gapWorkRank(gap({ allowableGapDays: 10 }))).toBe(3);
    const soon = new Date(Date.now() + 3 * 86400000);
    const mdy = `${String(soon.getMonth() + 1).padStart(2, '0')}/${String(soon.getDate()).padStart(2, '0')}/${soon.getFullYear()}`;
    expect(gapWorkRank(gap({ pdc: 86, nextFillDue: mdy }))).toBe(4);
    expect(gapWorkRank(gap({ status: status('Pending Claim'), recon: { rework: true } }))).toBe(5);
    expect(gapWorkRank(gap())).toBe(6);
  });

  it('drops an unreachable member below other open work, and closed gaps below that', () => {
    expect(gapWorkRank(gap({ pdc: 74 }), { utr: true })).toBe(7);
    expect(gapWorkRank(gap({ status: status('Met for Year'), savability: 'Safe' }))).toBe(8);
  });

  it('calls a member unreachable after two failed attempts in a row, notes aside', () => {
    expect(unableToReach([{ result: 'failed' }, { result: 'note' }, { result: 'failed' }])).toBe(true);
    expect(unableToReach([{ result: 'failed' }, { result: 'success' }])).toBe(false);
  });
});

describe('fill length', () => {
  const g = (...days) => ({ medications: days.map((d, i) => ({ id: String(i), daysSupply: d })) });
  it('labels the days supply of active drugs and flags short fills', () => {
    expect(fillTypeLabel(g(90))).toBe('90-day');
    expect(fillTypeLabel(g(90, 30, 90))).toBe('30 / 90-day');
    expect(isShortFillCandidate(g(90, 30))).toBe(true);
    expect(isShortFillCandidate(g(90, 180))).toBe(false);
    expect(fillLengths({ medications: [{ daysSupply: 30, status: 'Discontinued' }, { daysSupply: 90 }] })).toEqual([90]);
  });
});
