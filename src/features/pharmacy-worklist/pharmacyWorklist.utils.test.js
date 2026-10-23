import { describe, expect, it } from 'vitest';
import { addDaysMdy, annotateClaims, enrichPharmacyMember, matchFill, measureStatus, reconcileMeasure, todayMdy } from './pharmacyWorklist.utils.js';

const daysAgo = (n) => addDaysMdy(todayMdy(), -n);

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
const paid = (daysAgoN, o = {}) => ({ date: daysAgo(daysAgoN), daysSupply: 30, claimId: `C${daysAgoN}`, claimStatus: 'Paid', ...o });

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

describe('measureStatus', () => {
  it('is Closed-Data once the claim matches, while the fill covers today', () => {
    const st = measureStatus(fillMeasure({ filledDaysAgo: 10, supply: 30, claims: [paid(10)] }), { callHistory: [] });
    expect(st).toMatchObject({ gap: 'Closed-Data', label: 'Claim matched', done: true });
  });

  it('is Completed, projected, while the confirmed fill waits for its claim', () => {
    const st = measureStatus(fillMeasure({ filledDaysAgo: 3, supply: 30 }), { callHistory: [] });
    expect(st).toMatchObject({ gap: 'Completed', label: 'Pending claim', done: true });
  });

  it('flags Claim not matched once the window passes with no claim', () => {
    const x = fillMeasure({ filledDaysAgo: 40, supply: 90 });
    expect(measureStatus(x, { callHistory: [] })).toMatchObject({ gap: 'In Progress', label: 'Claim not matched', done: false, medId: 'm1' });
    expect(reconcileMeasure(x)).toMatchObject({ status: 'Claim not matched', medId: 'm1' });
  });

  it('reopens once the supply has run out, even though the claim matched', () => {
    const st = measureStatus(fillMeasure({ filledDaysAgo: 60, supply: 30, claims: [paid(60)] }), { callHistory: [] });
    expect(st.gap).toBe('Open');
    expect(st.label).toBe('Refill overdue');
  });

  it('puts a settled gap back in play when someone sets it to Open by hand', () => {
    const x = { ...fillMeasure({ filledDaysAgo: 10, supply: 30, claims: [paid(10)] }), status: 'Open', statusManual: true };
    const st = measureStatus(x, { callHistory: [] });
    expect(st.gap).toBe('Open');
    expect(st.done).toBe(false);
    const m = enrichPharmacyMember({ id: 'm', memberId: 'm', measures: [x] });
    expect(m.progress.closed).toBe(0);
    expect(m.urgentOpen).toBe(true);
  });

  it('counts only Closed-Data gaps as closed in progress', () => {
    const m = enrichPharmacyMember({ id: 'm', memberId: 'm', measures: [
      fillMeasure({ filledDaysAgo: 3, supply: 30 }),
      { ...fillMeasure({ filledDaysAgo: 10, supply: 30, claims: [paid(10)] }), code: 'MAH' },
    ] });
    expect(m.progress).toMatchObject({ closed: 1, total: 2 });
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
    expect(m.status).toBe('Closed-Data');
  });
});
