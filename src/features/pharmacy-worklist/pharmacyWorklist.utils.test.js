import { describe, expect, it } from 'vitest';
import {
  addDaysMdy, annotateClaims, claimRecordStatus, enrichPharmacyMember, matchFill, measureStatus, medicationStatus,
  nextFillDueSource, planTimers, reconcileMeasure, savability, setPlanTimers, todayMdy,
} from './pharmacyWorklist.utils.js';

const daysAgo = (n) => addDaysMdy(todayMdy(), -n);
const inDays = (n) => addDaysMdy(todayMdy(), n);
const NO_CALLS = { callHistory: [] };

// One MAD drug with `supply` days on hand, filled `filledDaysAgo` days ago
// and confirmed in Fold that day, plus whatever claims the test adds.
const fillMeasure = ({ filledDaysAgo, supply, claims = [] }) => ({
  code: 'MAD',
  pdc: 85,
  failDate: addDaysMdy(todayMdy(), 60),
  nextFillDue: addDaysMdy(daysAgo(filledDaysAgo), supply),
  medications: [{
    id: 'm1', name: 'Metformin', strength: '500', unit: 'MG', status: 'Active', daysSupply: supply, lastFill: daysAgo(filledDaysAgo),
    refills: [
      { date: daysAgo(filledDaysAgo), daysSupply: supply, source: 'Pickup confirmed by call' },
      ...claims,
    ],
  }],
});
// One MAD drug known only from the claim feed: nothing logged in Fold.
const claimMeasure = ({ claims = [], nextDueIn, pdc = 85, failIn = 60, ...rest }) => ({
  code: 'MAD',
  pdc,
  failDate: inDays(failIn),
  nextFillDue: nextDueIn == null ? null : inDays(nextDueIn),
  medications: [{
    id: 'm1', name: 'Metformin', strength: '500', unit: 'MG', status: 'Active', daysSupply: 30, lastFill: claims[0]?.date,
    refills: claims,
  }],
  ...rest,
});
const paid = (daysAgoN, o = {}) => ({ date: daysAgo(daysAgoN), daysSupply: 30, claimId: `C${daysAgoN}`, claimStatus: 'Paid', ...o });
const reversalOf = (claimId, daysAgoN) => ({ date: daysAgo(daysAgoN), claimId: `${claimId}-R`, txnType: 'Reversal', claimStatus: 'Reversed', reversesClaimId: claimId });
const outreach = (daysAgoN) => ({ callHistory: [{ kind: 'outreach', date: daysAgo(daysAgoN), measures: ['MAD'], result: 'success' }] });

describe('annotateClaims', () => {
  it('counts only the current version of a resubmitted claim', () => {
    const c = annotateClaims([
      paid(10, { claimId: 'A', claimSeq: 1 }),
      paid(10, { claimId: 'A-2', claimGroup: 'A', claimSeq: 2 }),
    ]);
    expect(c.map(x => x.effect)).toEqual(['Superseded', 'Counts']);
    expect(c[1].txnType).toBe('Rebill');
  });

  it('voids a claim named by a reversal, including a negative-value one', () => {
    const c = annotateClaims([
      paid(20, { claimId: 'A' }),
      paid(18, { claimId: 'A-R', qty: -30, daysSupply: -30, reversesClaimId: 'A' }),
    ]);
    expect(c.map(x => x.effect)).toEqual(['Reversed', 'Reversal']);
    expect(c[0].reversedOn).toBe(daysAgo(18));
  });

  it('puts a reversal in the group of the claim it reverses', () => {
    const c = annotateClaims([paid(20, { claimId: 'A' }), paid(18, { claimId: 'A-R', txnType: 'Reversal', reversesClaimId: 'A' })]);
    expect(c.map(x => x.claimGroup)).toEqual(['A', 'A']);
  });

  it('does not count cancelled, deleted, rejected or non-Part D claims', () => {
    const c = annotateClaims([
      paid(1, { claimStatus: 'Cancelled' }), paid(2, { claimStatus: 'Deleted' }),
      paid(3, { claimStatus: 'Rejected' }), paid(4, { coverage: 'Commercial' }),
    ]);
    expect(c.map(x => x.counts)).toEqual([false, false, false, false]);
    expect(c[3].effect).toBe('Not Part D');
  });

  it('holds a zero days supply or an unlinked negative row for review', () => {
    const c = annotateClaims([paid(5, { daysSupply: 0 }), paid(6, { qty: -30, daysSupply: -30 })]);
    expect(c.map(x => x.effect)).toEqual(['Invalid', 'Invalid']);
    expect(c.map(claimRecordStatus)).toEqual(['Invalid', 'Invalid']);
  });

  it('names each claim by its record status', () => {
    const c = annotateClaims([
      paid(20, { claimId: 'A', claimSeq: 1 }), paid(20, { claimId: 'A-2', claimGroup: 'A', claimSeq: 2 }),
      paid(10, { coverage: 'Commercial' }),
    ]);
    expect(c.map(claimRecordStatus)).toEqual(['Replaced by a newer version', 'Paid, current version', 'Non–Part D']);
  });
});

describe('matchFill', () => {
  const fill = (n) => ({ date: daysAgo(n), source: 'Entered by hand', manual: true });

  it('is verified by a counting claim near the fill', () => {
    expect(matchFill(fill(10), annotateClaims([paid(9)])).status).toBe('Verified');
  });

  it('waits for the claim inside the plan window, then flags it', () => {
    expect(matchFill(fill(5), []).status).toBe('Pending claim');
    expect(matchFill(fill(30), [])).toMatchObject({ status: 'Not matched', kind: 'no-claim' });
  });

  it('flags a reversed claim and one billed to other coverage', () => {
    expect(matchFill(fill(10), annotateClaims([paid(10, { claimStatus: 'Reversed' })])).kind).toBe('voided');
    expect(matchFill(fill(10), annotateClaims([paid(10, { coverage: 'Medicaid' })])).kind).toBe('other-coverage');
  });
});

// One test per row of the spec's transition table.
describe('gap status transitions', () => {
  it('(none) → Open: the payer lists the gap and no work is logged', () => {
    expect(measureStatus(claimMeasure({ nextDueIn: 30 }), NO_CALLS)).toMatchObject({ gap: 'Open', label: 'On track', done: false });
  });

  it('Open → In Progress: the team logs outreach', () => {
    expect(measureStatus(claimMeasure({ nextDueIn: 30 }), outreach(0)).gap).toBe('In Progress');
  });

  it('Open or In Progress → Pending Claim: a fill is logged in Fold', () => {
    const x = fillMeasure({ filledDaysAgo: 3, supply: 30 });
    expect(measureStatus(x, NO_CALLS)).toMatchObject({ gap: 'Pending Claim', label: 'Awaiting claim', done: true });
    expect(reconcileMeasure(x)).toMatchObject({ status: 'Awaiting claim' });
  });

  it('Pending Claim → Closed: a paid Part D claim matches the fill', () => {
    const x = fillMeasure({ filledDaysAgo: 10, supply: 30, claims: [paid(10)] });
    expect(measureStatus(x, NO_CALLS)).toMatchObject({ gap: 'Closed', label: 'Reversal watch', done: true });
    expect(reconcileMeasure(x).status).toBe('Claim matched');
  });

  it('Open → Closed: a claim with no fill logged closes the gap without team action', () => {
    expect(measureStatus(claimMeasure({ claims: [paid(5)], nextDueIn: 25 }), NO_CALLS).gap).toBe('Closed');
  });

  it('Pending Claim → In Progress: the match window ends with no claim', () => {
    const x = fillMeasure({ filledDaysAgo: 40, supply: 90 });
    expect(measureStatus(x, NO_CALLS)).toMatchObject({ gap: 'In Progress', label: 'Claim not matched – rework', done: false, medId: 'm1' });
    expect(reconcileMeasure(x)).toMatchObject({ status: 'Claim not matched', medId: 'm1', rework: true });
  });

  it('Pending Claim → In Progress: the claim was billed outside Part D', () => {
    const x = fillMeasure({ filledDaysAgo: 10, supply: 30, claims: [paid(10, { coverage: 'Commercial' })] });
    expect(measureStatus(x, NO_CALLS)).toMatchObject({ gap: 'In Progress', label: 'Non–Part D claim', medId: 'm1' });
    expect(reconcileMeasure(x)).toMatchObject({ status: 'Non–Part D claim', rework: true });
  });

  it('Closed → Open: a reversal arrives for the counted claim', () => {
    const x = claimMeasure({ claims: [paid(20, { claimId: 'A' }), reversalOf('A', 5)], nextDueIn: 10 });
    expect(measureStatus(x, NO_CALLS)).toMatchObject({ gap: 'Open', label: 'Claim reversed', medId: 'm1' });
    expect(reconcileMeasure(x)).toMatchObject({ status: 'Claim reversed', rework: true });
  });

  it('reopens a closed projected fill when its matched claim is reversed', () => {
    const x = fillMeasure({ filledDaysAgo: 10, supply: 30, claims: [paid(10, { claimId: 'A' }), reversalOf('A', 2)] });
    expect(measureStatus(x, NO_CALLS)).toMatchObject({ gap: 'Open', label: 'Claim reversed' });
  });

  it('counts outreach toward In Progress only once it follows the reversal', () => {
    const x = claimMeasure({ claims: [paid(20, { claimId: 'A' }), reversalOf('A', 5)], nextDueIn: 10 });
    expect(measureStatus(x, outreach(8)).gap).toBe('Open');
    expect(measureStatus(x, outreach(1)).gap).toBe('In Progress');
  });

  it('Closed → Closed: a rebill with a newer sequence replaces the older version', () => {
    const x = claimMeasure({ claims: [paid(10, { claimId: 'A', claimSeq: 1 }), paid(10, { claimId: 'A-2', claimGroup: 'A', claimSeq: 2 })], nextDueIn: 20 });
    expect(measureStatus(x, NO_CALLS).gap).toBe('Closed');
  });

  it('Closed: the reversal watch ends with no reversal and the sub-status moves to On track', () => {
    expect(measureStatus(claimMeasure({ claims: [paid(25, { daysSupply: 60 })], nextDueIn: 35 }), NO_CALLS))
      .toMatchObject({ gap: 'Closed', label: 'On track' });
  });

  it('Closed → Open: Next Fill Due enters the outreach window', () => {
    expect(measureStatus(claimMeasure({ claims: [paid(20)], nextDueIn: 10 }), NO_CALLS))
      .toMatchObject({ gap: 'Open', label: 'Refill due soon' });
  });

  it('→ Met for Year: the payer sends Already adherent or one fill left', () => {
    expect(measureStatus(claimMeasure({ nextDueIn: 5, projectedStatus: 'Already adherent' }), NO_CALLS)).toMatchObject({ gap: 'Met for Year', done: true });
    expect(measureStatus(claimMeasure({ nextDueIn: 5, oneFillToInvincible: true }), NO_CALLS).gap).toBe('Met for Year');
  });

  it('→ Met for Year: claims alone keep PDC at or above 80% through year end', () => {
    const x = claimMeasure({ claims: [paid(5, { daysSupply: 120 })], nextDueIn: 115 });
    expect(measureStatus(x, NO_CALLS).gap).toBe('Met for Year');
  });

  it('trusts a plan PDC below 80% over our claims math', () => {
    const x = claimMeasure({ claims: [paid(5, { daysSupply: 120 })], nextDueIn: 115, pdc: 76 });
    expect(measureStatus(x, NO_CALLS).gap).not.toBe('Met for Year');
  });

  it('a projected fill never makes a gap Met for Year', () => {
    expect(measureStatus({ ...fillMeasure({ filledDaysAgo: 3, supply: 120 }) }, NO_CALLS).gap).toBe('Pending Claim');
  });

  it('→ Failed for Year: today passes the absolute fail date', () => {
    const x = claimMeasure({ claims: [paid(40)], nextDueIn: -10, failIn: -1, pdc: 70 });
    expect(measureStatus(x, NO_CALLS)).toMatchObject({ gap: 'Failed for Year', done: true });
  });

  it('→ Excluded: the payer excludes the member, from any status', () => {
    const x = { ...fillMeasure({ filledDaysAgo: 10, supply: 30, claims: [paid(10)] }), excluded: true };
    expect(measureStatus(x, NO_CALLS)).toMatchObject({ gap: 'Excluded', done: true });
  });

  it('holds First Fill and Not Eligible gaps in the background', () => {
    expect(measureStatus(claimMeasure({ nextDueIn: 5, firstFill: true }), NO_CALLS).gap).toBe('First Fill');
    expect(measureStatus(claimMeasure({ nextDueIn: 5 }), { ...NO_CALLS, eligibilityStatus: 'Termed' }).gap).toBe('Not Eligible');
  });
});

describe('gap sub-status', () => {
  it('shows the highest true signal: Low PDC beats Refill due soon', () => {
    expect(measureStatus(claimMeasure({ nextDueIn: 5, pdc: 70 }), NO_CALLS).label).toBe('Low PDC');
  });

  it('shows Refill overdue past Next Fill Due', () => {
    expect(measureStatus(claimMeasure({ claims: [paid(40)], nextDueIn: -10 }), NO_CALLS))
      .toMatchObject({ gap: 'Open', label: 'Refill overdue' });
  });
});

describe('manual status', () => {
  it('lets the team move a workable gap between Open and In Progress', () => {
    const x = { ...claimMeasure({ nextDueIn: 30 }), status: 'In Progress', statusManual: true };
    expect(measureStatus(x, NO_CALLS)).toMatchObject({ gap: 'In Progress', manual: true });
  });

  it('lets a hand-set status lapse once a newer fill or claim arrives', () => {
    const base = claimMeasure({ claims: [paid(40)], nextDueIn: -10 });
    const x = { ...base, status: 'In Progress', statusManual: true, statusManualSince: daysAgo(20) };
    expect(measureStatus(x, NO_CALLS)).toMatchObject({ gap: 'In Progress', manual: true });
    const refilled = { ...x, medications: [{ ...x.medications[0], refills: [paid(5, { daysSupply: 10 }), ...x.medications[0].refills] }], nextFillDue: inDays(5) };
    expect(measureStatus(refilled, NO_CALLS).manual).toBeUndefined();
  });

  it('never overrides a status Fold set', () => {
    const x = { ...fillMeasure({ filledDaysAgo: 10, supply: 30, claims: [paid(10)] }), status: 'Open', statusManual: true };
    expect(measureStatus(x, NO_CALLS)).toMatchObject({ gap: 'Closed', done: true });
    expect(measureStatus(x, NO_CALLS).manual).toBeUndefined();
  });
});

describe('medicationStatus', () => {
  const med = (x) => ({ ...x.medications[0], nextFill: x.nextFillDue });

  it('follows the fill against its claim', () => {
    expect(medicationStatus(med(fillMeasure({ filledDaysAgo: 3, supply: 30 })))).toBe('Fill projected');
    expect(medicationStatus(med(fillMeasure({ filledDaysAgo: 10, supply: 30, claims: [paid(10)] })))).toBe('Filled – claim matched');
    expect(medicationStatus(med(fillMeasure({ filledDaysAgo: 40, supply: 90 })))).toBe('Not matched – rework');
    expect(medicationStatus(med(claimMeasure({ claims: [paid(20, { claimId: 'A' }), reversalOf('A', 5)], nextDueIn: 10 })))).toBe('Fill reversed');
  });

  it('follows Next Fill Due when nothing is pending', () => {
    expect(medicationStatus(med(claimMeasure({ claims: [paid(20)], nextDueIn: 30 })))).toBe('On track');
    expect(medicationStatus(med(claimMeasure({ claims: [paid(20)], nextDueIn: 5 })))).toBe('Refill due');
    expect(medicationStatus(med(claimMeasure({ claims: [paid(40)], nextDueIn: -10 })))).toBe('Refill overdue');
    expect(medicationStatus({ status: 'Discontinued' })).toBe('Discontinued or switched');
  });
});

describe('savability', () => {
  const of = (x, member = NO_CALLS) => savability(measureStatus(x, member));

  it('is Safe when Met for Year and Not savable when Failed for Year', () => {
    expect(of(claimMeasure({ nextDueIn: 5, projectedStatus: 'Already adherent' }))).toBe('Safe');
    expect(of(claimMeasure({ claims: [paid(40)], nextDueIn: -10, failIn: -1 }))).toBe('Not savable');
  });

  it('stays Savable when a logged fill reaches 80% past a stale plan fail date', () => {
    const x = { ...fillMeasure({ filledDaysAgo: 3, supply: 90 }), failDate: daysAgo(2), pdcProjected: 85, failDateProjected: null };
    expect(of(x)).toBe('Savable');
    expect(enrichPharmacyMember({ id: 'm', memberId: 'm', measures: [x] }).gaps[0].allowableGapDays).toBeNull();
  });

  it('is Savable while allowable gap days remain', () => {
    expect(of(claimMeasure({ nextDueIn: 5, failIn: 40 }))).toBe('Savable');
  });
});

describe('nextFillDueSource', () => {
  it('reads the plan date as plan-provided until Fold recalculates it', () => {
    expect(nextFillDueSource(claimMeasure({ nextDueIn: 10 }))).toBe('Plan');
    expect(nextFillDueSource({ ...claimMeasure({ nextDueIn: 10 }), nextFillDueCalculated: true })).toBe('Calculated');
    expect(nextFillDueSource({ ...claimMeasure({ nextDueIn: 10 }), pdcProjected: 90 })).toBe('Projected');
  });
});

describe('planTimers', () => {
  it('reads each plan its timers from pharmacy_plan_timers, with defaults for the rest', () => {
    setPlanTimers([{ health_plan: 'SCAN Classic', match_window_days: 21, feed_lag_days: 10, return_to_stock_days: 14, refill_due_days: 7 }]);
    expect(planTimers('SCAN Classic')).toEqual({ matchWindowDays: 21, feedLagDays: 10, reversalWatchDays: 24, refillDueDays: 7 });
    expect(planTimers('Other Plan')).toEqual({ matchWindowDays: 14, feedLagDays: 7, reversalWatchDays: 21, refillDueDays: 14 });
    // A shorter outreach window keeps the gap closed longer.
    const x = claimMeasure({ claims: [paid(20)], nextDueIn: 10 });
    expect(measureStatus(x, { ...NO_CALLS, healthPlan: 'SCAN Classic' }).gap).toBe('Closed');
    setPlanTimers([]);
    // No rows puts the built-in stand-ins back.
    expect(planTimers('SCAN Classic').matchWindowDays).toBe(21);
  });
});

describe('enrichPharmacyMember: progress and roll-up', () => {
  it('counts Closed and Met for Year as closed; Excluded leaves the count', () => {
    const m = enrichPharmacyMember({ id: 'm', memberId: 'm', measures: [
      fillMeasure({ filledDaysAgo: 10, supply: 30, claims: [paid(10)] }),
      { ...claimMeasure({ nextDueIn: 5, projectedStatus: 'Already adherent' }), code: 'MAH' },
      { ...claimMeasure({ nextDueIn: 5, excluded: true }), code: 'MAC' },
    ] });
    expect(m.progress).toMatchObject({ label: 'Complete', closed: 2, total: 2 });
  });

  it('does not count a projected fill as closed', () => {
    const m = enrichPharmacyMember({ id: 'm', memberId: 'm', measures: [
      fillMeasure({ filledDaysAgo: 3, supply: 30 }),
      { ...fillMeasure({ filledDaysAgo: 10, supply: 30, claims: [paid(10)] }), code: 'MAH' },
    ] });
    expect(m.progress).toMatchObject({ label: 'Partially complete', closed: 1, total: 2 });
  });

  it('puts the savability on each gap', () => {
    const m = enrichPharmacyMember({ id: 'm', memberId: 'm', measures: [claimMeasure({ nextDueIn: 5, failIn: 40 })] });
    expect(m.gaps[0].savability).toBe('Savable');
  });
});

describe('enrichPharmacyMember: worklist fields', () => {
  it('keeps First Fill and Not Eligible gaps off the row and out of its numbers', () => {
    const m = enrichPharmacyMember({ id: 'm', memberId: 'm', measures: [
      claimMeasure({ nextDueIn: 30 }),
      { ...claimMeasure({ nextDueIn: -5, pdc: 50, firstFill: true }), code: 'MAH' },
    ] });
    expect(m.gaps.map(g => g.code)).toEqual(['MAD']);
    expect(m.urgent.code).toBe('MAD');
    const termed = enrichPharmacyMember({ id: 't', memberId: 't', eligibilityStatus: 'Termed', measures: [claimMeasure({ nextDueIn: 30 })] });
    expect(termed.gaps).toEqual([]);
  });

  it('counts days left in the claim window while a fill awaits its claim', () => {
    expect(reconcileMeasure(fillMeasure({ filledDaysAgo: 3, supply: 30 })).daysLeft).toBe(11);
  });

  it('counts outreach attempts this fill cycle only', () => {
    const member = { id: 'm', memberId: 'm', callHistory: [
      { date: daysAgo(2), measures: ['MAD'] }, { date: daysAgo(5), measures: ['MAD'] }, { date: daysAgo(40), measures: ['MAD'] },
    ], measures: [claimMeasure({ claims: [paid(20)], nextDueIn: 10 })] };
    expect(enrichPharmacyMember(member).gaps[0].attempts).toBe(2);
  });

  it('works out days missed and MPR from the claims', () => {
    // 30 days supplied 50 days ago: 20 uncovered days since, and 60% MPR.
    const g = enrichPharmacyMember({ id: 'm', memberId: 'm', measures: [claimMeasure({ claims: [paid(50)], nextDueIn: -20 })] }).gaps[0];
    expect(g.daysMissed).toBe(20);
    expect(g.mpr).toBe(60);
  });
});

describe('enrichPharmacyMember: other care gaps', () => {
  const member = {
    id: '19401', memberId: '19401', name: 'Test Member',
    measures: [fillMeasure({ filledDaysAgo: 10, supply: 30, claims: [paid(10)] })],
    otherCareGaps: [{ code: 'CBP', name: 'Controlling Blood Pressure', status: 'Open' }],
  };

  it('uses the live HEDIS gaps when the member has a HEDIS record, open ones only', () => {
    const hedisGapsByMember = new Map([['19401', [{ code: 'CBP', status: 'Open' }, { code: 'EED', status: 'Engaged' }, { code: 'COL', status: 'Completed' }, { code: 'BCS', status: 'Closed - Data' }]]]);
    const m = enrichPharmacyMember(member, { hedisGapsByMember });
    expect(m.otherCareGaps.map(g => g.code)).toEqual(['CBP', 'EED']);
  });

  it('falls back to the stored plan-file list without one', () => {
    const m = enrichPharmacyMember(member, { hedisGapsByMember: new Map() });
    expect(m.otherCareGapsCount).toBe(1);
  });

  it('ignores a member-level manual status', () => {
    const m = enrichPharmacyMember({ ...member, status: 'Open', statusManual: true });
    expect(m.status).toBe('Closed');
  });
});
